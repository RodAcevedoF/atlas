import { expect, test } from "bun:test";
import type { Session, User } from "@atlas/domain";
import { emptyProfile, makeUserId } from "@atlas/domain";
import { inMemoryUserStore } from "../../testing/user-store.fake.ts";
import type { IdentityProviderPort } from "../outbound/identity-provider.ts";
import type { SessionPort } from "../outbound/session-store.ts";
import { AuthenticateWithProviderUseCase } from "./authenticate-with-provider-usecase.ts";

const GOOGLE_ID = "google-123";

function oauthUser(): User {
  return {
    id: makeUserId("user-1"),
    email: "new-account-email@atlas.test",
    emailVerified: true,
    role: "user",
    identities: [
      {
        provider: "google",
        providerUserId: GOOGLE_ID,
        email: "original-provider-email@atlas.test",
      },
    ],
    profile: emptyProfile(),
    createdAt: new Date("2026-08-30T10:00:00Z"),
  };
}

test("OAuth login follows the stable provider id after an admin changes the account email", async () => {
  const { store, users } = inMemoryUserStore([oauthUser()]);
  const provider: IdentityProviderPort = {
    provider: "google",
    authenticate: () =>
      Promise.resolve({
        provider: "google",
        providerUserId: GOOGLE_ID,
        email: "original-provider-email@atlas.test",
        emailVerified: true,
      }),
  };
  const heldSessions: Session[] = [];
  const sessions: SessionPort = {
    create(session) {
      heldSessions.push(session);
      return Promise.resolve();
    },
    find: () => Promise.reject(new Error("find is outside the path under test")),
    delete: () => Promise.reject(new Error("delete is outside the path under test")),
  };
  const useCase = new AuthenticateWithProviderUseCase({ google: provider }, store, sessions);

  const result = await useCase.execute({ provider: "google", payload: {} });

  expect(result.user.email).toBe("new-account-email@atlas.test");
  expect(users()).toHaveLength(1);
  expect(heldSessions[0]?.userId).toBe(makeUserId("user-1"));
});
