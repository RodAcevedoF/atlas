import { afterAll, expect, test } from "bun:test";
import {
  AuthenticateUseCase,
  AuthenticateWithProviderUseCase,
  InvalidCredentialsError,
  ResetAdminUserPasswordUseCase,
} from "@atlas/application";
import { type User, emptyProfile, makeSessionToken, makeUserId, toPublicUser } from "@atlas/domain";
import { Redis } from "ioredis";
import { MongoClient } from "mongodb";
import { PasswordIdentityProvider } from "../identity-password/index.ts";
import { HeldHasher } from "../identity-password/testing/held-hasher.ts";
import { BunPasswordHasher } from "../password-bun/index.ts";
import { RedisSessionStore } from "../session-redis/index.ts";
import { MongoUserStore, ensureUserIndexes } from "./index.ts";

const mongoUrl = process.env.AT016_TEST_MONGO_URL;
const redisUrl = process.env.AT016_TEST_REDIS_URL;
const integrationTest = mongoUrl && redisUrl ? test : test.skip;
const mongo = mongoUrl ? new MongoClient(mongoUrl, { serverSelectionTimeoutMS: 2000 }) : null;
const redis = redisUrl
  ? new Redis(redisUrl, { lazyConnect: true, retryStrategy: () => null, commandTimeout: 2000 })
  : null;

afterAll(async () => {
  redis?.disconnect();
  await mongo?.close();
});

async function setup() {
  if (!mongo || !redis) throw new Error("AT016 test URLs must point to isolated MongoDB and Redis");
  const db = mongo.db(`at016_${crypto.randomUUID().replaceAll("-", "")}`);
  await ensureUserIndexes(db);
  const users = new MongoUserStore(db);
  const sessions = new RedisSessionStore(redis);
  const hasher = new BunPasswordHasher();
  const user: User = {
    id: makeUserId(crypto.randomUUID()),
    email: "owner@atlas.test",
    emailVerified: true,
    role: "user",
    identities: [
      {
        provider: "password",
        providerUserId: "password-owner",
        email: "owner@atlas.test",
        secret: await hasher.hash("old password"),
      },
      { provider: "google", providerUserId: "google-owner", email: "owner@atlas.test" },
    ],
    profile: emptyProfile(),
    createdAt: new Date(),
  };
  await users.createUser(user);
  const passwords = new PasswordIdentityProvider(users, hasher);
  const auth = new AuthenticateWithProviderUseCase({ password: passwords }, users, sessions);
  const reset = new ResetAdminUserPasswordUseCase(users, hasher);
  return {
    db,
    users,
    sessions,
    hasher,
    user,
    passwords,
    auth,
    reset,
    actor: { ...toPublicUser(user), role: "super_admin" as const },
    authenticate: new AuthenticateUseCase(sessions, users),
  };
}

integrationTest(
  "Mongo password resets revoke Redis sessions and preserve OAuth identities across repeated resets",
  async () => {
    const subject = await setup();
    const login = (password: string) =>
      subject.auth.execute({
        provider: "password",
        payload: { email: subject.user.email, password },
      });
    const old = await login("old password");

    await subject.reset.execute({
      actor: subject.actor,
      targetUserId: subject.user.id,
      password: "new password",
    });
    const fresh = await login("new password");

    expect(await subject.authenticate.execute(old.token)).toBeNull();
    expect((await subject.authenticate.execute(fresh.token))?.id).toBe(subject.user.id);
    expect(
      (await subject.sessions.find(makeSessionToken(fresh.token)))?.authenticationVersion,
    ).toBe(1);
    await expect(login("old password")).rejects.toThrow(InvalidCredentialsError);
    expect(
      (
        await subject.users.findUserByIdentity({
          provider: "google",
          providerUserId: "google-owner",
        })
      )?.id,
    ).toBe(subject.user.id);

    await subject.reset.execute({
      actor: subject.actor,
      targetUserId: subject.user.id,
      password: "latest password",
    });

    expect(await subject.authenticate.execute(fresh.token)).toBeNull();
    const latest = await login("latest password");
    expect((await subject.authenticate.execute(latest.token))?.id).toBe(subject.user.id);
  },
);

integrationTest(
  "a password check overlapping reset cannot issue a usable new session",
  async () => {
    const subject = await setup();
    const held = new HeldHasher(subject.hasher);
    const auth = new AuthenticateWithProviderUseCase(
      { password: new PasswordIdentityProvider(subject.users, held) },
      subject.users,
      subject.sessions,
    );
    const login = auth.execute({
      provider: "password",
      payload: { email: subject.user.email, password: "old password" },
    });
    await held.verificationReached;

    try {
      await subject.reset.execute({
        actor: subject.actor,
        targetUserId: subject.user.id,
        password: "new password",
      });
    } finally {
      held.resume();
    }

    await expect(login).rejects.toThrow(InvalidCredentialsError);
  },
);

integrationTest(
  "legacy passwordHash accounts and versionless sessions work until their first reset",
  async () => {
    const subject = await setup();
    const id = makeUserId(crypto.randomUUID());
    const email = "legacy@atlas.test";
    await subject.db
      .collection<{
        _id: string;
        email: string;
        passwordHash: string;
        profile: User["profile"];
        createdAt: Date;
      }>("users")
      .insertOne({
        _id: id,
        email,
        passwordHash: await subject.hasher.hash("legacy password"),
        profile: emptyProfile(),
        createdAt: new Date(),
      });
    const login = (password: string) =>
      subject.auth.execute({ provider: "password", payload: { email, password } });
    const original = await login("legacy password");
    if (!redis) throw new Error("Missing isolated Redis");
    const token = makeSessionToken(crypto.randomUUID());
    await redis.set(
      `session:${token}`,
      JSON.stringify({
        userId: id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }),
      "EX",
      60,
    );
    expect((await subject.authenticate.execute(token))?.id).toBe(id);

    await subject.reset.execute({
      actor: subject.actor,
      targetUserId: id,
      password: "replacement password",
    });

    expect(await subject.authenticate.execute(token)).toBeNull();
    expect(await subject.authenticate.execute(original.token)).toBeNull();
    const replacement = await login("replacement password");
    expect((await subject.authenticate.execute(replacement.token))?.id).toBe(id);
  },
);
