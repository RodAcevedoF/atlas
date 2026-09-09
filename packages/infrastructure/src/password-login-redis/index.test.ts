import { afterAll, expect, test } from "bun:test";
import {
  AuthenticateWithProviderUseCase,
  GuardedPasswordProvider,
  InvalidCredentialsError,
  type PasswordLoginState,
} from "@atlas/application";
import { type User, emptyProfile, makeSessionToken, makeUserId } from "@atlas/domain";
import { Redis } from "ioredis";
import { MemoryProviderIdentities } from "../../../application/src/auth/testing/provider-identities.ts";
import { inMemoryUserStore } from "../../../application/src/testing/user-store.fake.ts";
import { PasswordIdentityProvider } from "../identity-password/index.ts";
import { BunPasswordHasher } from "../password-bun/index.ts";
import { RedisSessionStore } from "../session-redis/index.ts";
import { RedisPasswordLoginState } from "./index.ts";

const url = process.env.AT015_TEST_REDIS_URL;
const integrationTest = url ? test : test.skip;
const redis = url
  ? new Redis(url, { lazyConnect: true, retryStrategy: () => null, commandTimeout: 2000 })
  : null;

afterAll(() => {
  redis?.disconnect();
});

function setup() {
  if (!redis) throw new Error("AT015_TEST_REDIS_URL must point to an isolated test Redis");
  return {
    redis,
    states: new RedisPasswordLoginState(redis),
    account: `${crypto.randomUUID()}@atlas.test`,
  };
}

function state(expiresAt = Date.now() + 60_000): PasswordLoginState {
  return { version: crypto.randomUUID(), failures: 0, lockedUntil: 0, leaseUntil: 0, expiresAt };
}

integrationTest(
  "Redis admits exactly one concurrent claim and rejects stale updates and deletes",
  async () => {
    const { states, account } = setup();
    const candidates = Array.from({ length: 20 }, () => state());

    const claimed = await Promise.all(
      candidates.map((candidate) => states.compareAndSet(account, null, candidate)),
    );
    const current = await states.read(account);
    if (!current) throw new Error("Missing claimed state");
    const replacement = state();
    const updated = await states.compareAndSet(account, current.version, replacement);
    const staleDelete = await states.compareAndSet(account, current.version, null);
    const staleWrite = await states.compareAndSet(account, current.version, state());

    expect(claimed.filter(Boolean)).toHaveLength(1);
    expect(updated).toBe(true);
    expect(staleDelete).toBe(false);
    expect(staleWrite).toBe(false);
    expect(await states.read(account)).toEqual(replacement);
    expect(await states.compareAndSet(account, replacement.version, null)).toBe(true);
    expect(await states.read(account)).toBeNull();
  },
);

integrationTest(
  "Redis expires records at the supplied deadline and accepts a fresh claim",
  async () => {
    const { states, account } = setup();
    const initial = state(Date.now() + 100);
    await states.compareAndSet(account, null, initial);
    expect(await states.read(account)).toEqual(initial);

    await Bun.sleep(150);

    expect(await states.read(account)).toBeNull();
    expect(await states.compareAndSet(account, initial.version, state())).toBe(false);
    expect(await states.compareAndSet(account, null, state())).toBe(true);
  },
);

integrationTest("real password verification and Redis lockout gate session issuance", async () => {
  const { redis, states, account } = setup();
  const hasher = new BunPasswordHasher();
  const user: User = {
    id: makeUserId(crypto.randomUUID()),
    email: account,
    emailVerified: true,
    role: "user",
    identities: [
      {
        provider: "password",
        providerUserId: account,
        email: account,
        secret: await hasher.hash("correct password"),
      },
    ],
    profile: emptyProfile(),
    createdAt: new Date(),
  };
  const { store } = inMemoryUserStore([user]);
  const sessions = new RedisSessionStore(redis);
  const provider = new GuardedPasswordProvider(new PasswordIdentityProvider(store, hasher), states);
  const googleIdentity = {
    provider: "google" as const,
    providerUserId: "google-owner",
    email: account,
    emailVerified: true,
  };
  user.identities.push(googleIdentity);
  const google = new MemoryProviderIdentities("google", new Map([["oauth-token", googleIdentity]]));
  const auth = new AuthenticateWithProviderUseCase({ password: provider, google }, store, sessions);
  const login = (password: string) =>
    auth.execute({
      provider: "password",
      payload: { email: ` ${account.toUpperCase()} `, password },
    });

  const first = await login("correct password");
  for (let attempt = 0; attempt < 5; attempt++) {
    await expect(login("wrong password")).rejects.toThrow(InvalidCredentialsError);
  }

  await expect(login("correct password")).rejects.toThrow("Invalid email or password");
  expect(first.user.id).toBe(user.id);
  expect((await sessions.find(makeSessionToken(first.token)))?.userId).toBe(user.id);
  const oauth = await auth.execute({ provider: "google", payload: "oauth-token" });
  expect(oauth.user.id).toBe(user.id);
  expect((await sessions.find(makeSessionToken(oauth.token)))?.userId).toBe(user.id);
  expect((await states.read(account))?.failures).toBe(5);
});
