import { expect, test } from "bun:test";
import type { User } from "@atlas/domain";
import { emptyProfile, makeUserId } from "@atlas/domain";
import { inMemoryUserStore } from "../../testing/user-store.fake.ts";
import { MemoryProviderIdentities } from "../testing/provider-identities.ts";
import { MemorySessions } from "../testing/sessions.ts";
import { InvalidCredentialsError } from "./auth.ts";
import { AuthenticateUseCase } from "./authenticate-usecase.ts";
import { AuthenticateWithProviderUseCase } from "./authenticate-with-provider-usecase.ts";
import { issueSession } from "./issue-session.ts";

function user(): User {
  return {
    id: makeUserId("victim"),
    email: "victim@external.test",
    emailVerified: true,
    role: "user",
    identities: [
      { provider: "google", providerUserId: "victim-google", email: "victim@external.test" },
    ],
    profile: emptyProfile(),
    createdAt: new Date(),
  };
}

for (const scenario of [
  {
    name: "different Google subject with unverified matching email",
    provider: "google" as const,
    verified: false,
    existingProvider: "google" as const,
    existingVerified: true,
  },
  {
    name: "different Google subject with verified matching email",
    provider: "google" as const,
    verified: true,
    existingProvider: "google" as const,
    existingVerified: true,
  },
  {
    name: "victim OAuth cannot claim a pre-registered attacker password account",
    provider: "google" as const,
    verified: true,
    existingProvider: "password" as const,
    existingVerified: false,
  },
  {
    name: "Google verification alone cannot link an existing password account",
    provider: "google" as const,
    verified: true,
    existingProvider: "password" as const,
    existingVerified: true,
  },
  {
    name: "GitHub cannot auto-link an existing Google account",
    provider: "github" as const,
    verified: true,
    existingProvider: "google" as const,
    existingVerified: true,
  },
]) {
  test(scenario.name, async () => {
    const victim = user();
    victim.emailVerified = scenario.existingVerified;
    victim.identities = [
      {
        provider: scenario.existingProvider,
        providerUserId: "existing-identity",
        email: victim.email,
      },
    ];
    const { store, users } = inMemoryUserStore([victim]);
    const provider = new MemoryProviderIdentities(
      scenario.provider,
      new Map([
        [
          "token",
          {
            provider: scenario.provider,
            providerUserId: "different-identity",
            email: victim.email,
            emailVerified: scenario.verified,
          },
        ],
      ]),
    );
    const auth = new AuthenticateWithProviderUseCase(
      { [scenario.provider]: provider },
      store,
      new MemorySessions(),
    );

    await expect(auth.execute({ provider: scenario.provider, payload: "token" })).rejects.toThrow(
      InvalidCredentialsError,
    );

    expect(users()).toEqual([victim]);
  });
}

test("unverified OAuth email cannot create a verified account", async () => {
  const { store, users } = inMemoryUserStore();
  const google = new MemoryProviderIdentities(
    "google",
    new Map([
      [
        "token",
        {
          provider: "google",
          providerUserId: "new-google",
          email: "new@external.test",
          emailVerified: false,
        },
      ],
    ]),
  );
  const auth = new AuthenticateWithProviderUseCase({ google }, store, new MemorySessions());

  await expect(auth.execute({ provider: "google", payload: "token" })).rejects.toThrow(
    InvalidCredentialsError,
  );

  expect(users()).toHaveLength(0);
});

test("verified new OAuth users can create an account and authenticate their session", async () => {
  const { store } = inMemoryUserStore();
  const google = new MemoryProviderIdentities(
    "google",
    new Map([
      [
        "token",
        {
          provider: "google",
          providerUserId: "new-google",
          email: "new@external.test",
          emailVerified: true,
        },
      ],
    ]),
  );
  const sessions = new MemorySessions();
  const auth = new AuthenticateWithProviderUseCase({ google }, store, sessions);

  const result = await auth.execute({ provider: "google", payload: "token" });

  expect((await new AuthenticateUseCase(sessions, store).execute(result.token))?.email).toBe(
    "new@external.test",
  );
});

test("a password authenticated before a reset cannot receive the new authentication version", async () => {
  const victim = user();
  victim.authenticationVersion = 1;
  victim.identities = [{ provider: "password", providerUserId: victim.id, email: victim.email }];
  const { store } = inMemoryUserStore([victim]);
  const password = new MemoryProviderIdentities(
    "password",
    new Map([
      [
        "old-check",
        {
          provider: "password",
          providerUserId: victim.id,
          email: victim.email,
          emailVerified: true,
          authenticationVersion: 0,
        },
      ],
    ]),
  );
  const auth = new AuthenticateWithProviderUseCase({ password }, store, new MemorySessions());

  await expect(auth.execute({ provider: "password", payload: "old-check" })).rejects.toThrow(
    InvalidCredentialsError,
  );
});

test("password replacement invalidates prior sessions while fresh sessions and other accounts remain usable", async () => {
  const victim = user();
  const other = { ...user(), id: makeUserId("other"), email: "other@atlas.test" };
  const { store } = inMemoryUserStore([victim, other]);
  const sessions = new MemorySessions();
  const old = await issueSession(sessions, victim.id);
  const otherSession = await issueSession(sessions, other.id);
  await store.replacePasswordAndInvalidateSessions(victim.id, {
    provider: "password",
    providerUserId: victim.id,
    email: victim.email,
    secret: "replacement",
  });
  const updated = await store.findUserById(victim.id);
  const fresh = await issueSession(sessions, victim.id, updated?.authenticationVersion);
  const auth = new AuthenticateUseCase(sessions, store);

  expect(await auth.execute(old.token)).toBeNull();
  expect((await auth.execute(fresh.token))?.id).toBe(victim.id);
  expect((await auth.execute(otherSession.token))?.id).toBe(other.id);
});

test("legacy sessions remain usable for accounts without a reset", async () => {
  const victim = user();
  const { store } = inMemoryUserStore([victim]);
  const sessions = new MemorySessions();
  const issued = await issueSession(sessions, victim.id);
  issued.authenticationVersion = undefined;
  await sessions.create(issued);

  expect((await new AuthenticateUseCase(sessions, store).execute(issued.token))?.id).toBe(
    victim.id,
  );
});
