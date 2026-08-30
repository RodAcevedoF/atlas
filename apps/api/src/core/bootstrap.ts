import type { InquiryRunId } from "@atlas/domain";
import { makeInquiryRunId } from "@atlas/domain";
import { PasswordIdentityProvider } from "@atlas/infra/identity-password";
import {
  MongoInquiryAttachmentStore,
  ensureInquiryAttachmentIndexes,
} from "@atlas/infra/inquiry-attachment-mongodb";
import { HttpOrchestration } from "@atlas/infra/orchestration-http";
import { BunPasswordHasher } from "@atlas/infra/password-bun";
import { MongoProfileImageStore } from "@atlas/infra/profile-image-mongodb";
import { RedisSessionStore, createRedisClient } from "@atlas/infra/session-redis";
import { MongoInquiryRunStore, createMongoClient, ensureIndexes } from "@atlas/infra/store-mongodb";
import { ExcelJsTabularParser } from "@atlas/infra/tabular-parser";
import { MongoUserOwnedDataStore } from "@atlas/infra/user-owned-data-mongodb";
import { MongoUserStore, ensureUserIndexes } from "@atlas/infra/user-store-mongodb";
import { RedisVerificationTokenStore } from "@atlas/infra/verification-redis";
import { type AdminDeps, makeAdminDependencies } from "../modules/admin/dependencies.ts";
import { type AuthDeps, makeAuthDependencies } from "../modules/auth/dependencies.ts";
import { makeEmailPort } from "../modules/auth/email.ts";
import { makeOAuthStrategies, readOAuthConfigs } from "../modules/auth/oauth.ts";
import { type InquiryDeps, makeInquiryDependencies } from "../modules/inquiry/dependencies.ts";
import { type ProfileDeps, makeProfileDependencies } from "../modules/profile/dependencies.ts";
import { type UsersDeps, makeUsersDependencies } from "../modules/users/dependencies.ts";

const DEFAULT_INQUIRY_RETRY_AFTER_MS = 11 * 60 * 1000;
const DEFAULT_INQUIRY_POLL_INTERVAL_MS = 5_000;
const DEFAULT_INQUIRY_RUN_TIMEOUT_MS = 120_000;
const DEFAULT_INQUIRY_DAILY_CAP = 5;

export interface AppDeps {
  auth: AuthDeps;
  profile: ProfileDeps;
  users: UsersDeps;
  inquiry: InquiryDeps;
  admin: AdminDeps;
  redis: ReturnType<typeof createRedisClient>;
}

function readPositiveNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${name} must be a positive number`);
  return parsed;
}

function readInquiryRunId(name: string): InquiryRunId | null {
  const raw = process.env[name]?.trim();
  return raw ? makeInquiryRunId(raw) : null;
}

function readPositiveInt(name: string, fallback: number): number {
  const parsed = readPositiveNumber(name, fallback);
  if (!Number.isInteger(parsed)) throw new Error(`${name} must be a whole number`);
  return parsed;
}

export async function bootstrap(): Promise<AppDeps> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");
  const dbName = process.env.MONGODB_DB_NAME ?? "atlas";

  const client = createMongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  await ensureIndexes(db);
  await ensureUserIndexes(db);
  await ensureInquiryAttachmentIndexes(db);

  const redis = createRedisClient(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");

  const userStore = new MongoUserStore(db);
  const profileImageStore = new MongoProfileImageStore(db);
  const sessionStore = new RedisSessionStore(redis);
  const hasher = new BunPasswordHasher();
  const userOwnedDataStore = new MongoUserOwnedDataStore(db);
  const orchestration = new HttpOrchestration(
    process.env.INTELLIGENCE_URL ?? "http://127.0.0.1:8888",
  );

  const identityProviders = {
    password: new PasswordIdentityProvider(userStore, hasher),
    ...makeOAuthStrategies(readOAuthConfigs()),
  };

  const verificationTokens = new RedisVerificationTokenStore(redis);
  const emailPort = makeEmailPort();
  const verificationConfig = { webAppUrl: process.env.WEB_APP_URL ?? "http://localhost:3000" };

  const auth = makeAuthDependencies({
    userStore,
    sessionStore,
    hasher,
    identityProviders,
    emailPort,
    verificationTokens,
    verificationConfig,
  });
  const profile = makeProfileDependencies({ userStore, profileImageStore });
  const users = makeUsersDependencies({ userStore, hasher, ownedData: userOwnedDataStore });
  const inquiryStore = new MongoInquiryRunStore(db);
  const inquiryAttachmentStore = new MongoInquiryAttachmentStore(db);
  const tabularParser = new ExcelJsTabularParser();
  const inquiry = makeInquiryDependencies({
    store: inquiryStore,
    attachmentStore: inquiryAttachmentStore,
    tabularParser,
    orchestration,
    retryAfterMs: readPositiveNumber("INQUIRY_RETRY_AFTER_MS", DEFAULT_INQUIRY_RETRY_AFTER_MS),
    runTimeoutMs: readPositiveNumber("INQUIRY_RUN_TIMEOUT_MS", DEFAULT_INQUIRY_RUN_TIMEOUT_MS),
    pollIntervalMs: readPositiveNumber(
      "INQUIRY_POLL_INTERVAL_MS",
      DEFAULT_INQUIRY_POLL_INTERVAL_MS,
    ),
    dailyCap: readPositiveInt("INQUIRY_DAILY_CAP", DEFAULT_INQUIRY_DAILY_CAP),
    pinnedRunId: readInquiryRunId("INQUIRY_PINNED_RUN_ID"),
  });
  const admin = makeAdminDependencies({ userStore, inquiryStore });

  return { auth, profile, users, inquiry, admin, redis };
}
