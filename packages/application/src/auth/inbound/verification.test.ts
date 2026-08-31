import { expect, test } from "bun:test";
import type { User } from "@atlas/domain";
import { emptyProfile, makeUserId } from "@atlas/domain";
import type { EmailMessage, EmailPort } from "../outbound/email.ts";
import type { VerificationTokenStorePort } from "../outbound/verification-token-store.ts";
import { issueVerification } from "./verification.ts";

test("a verification email links back to the browser verification route", async () => {
  const delivered: EmailMessage[] = [];
  const saved: { token: string; userId: string; ttlMs: number }[] = [];
  const email: EmailPort = {
    send(message) {
      delivered.push(message);
      return Promise.resolve();
    },
  };
  const tokens: VerificationTokenStorePort = {
    save(token, userId, ttlMs) {
      saved.push({ token, userId, ttlMs });
      return Promise.resolve();
    },
    consume: () => Promise.reject(new Error("consume is outside the path under test")),
  };
  const user: User = {
    id: makeUserId("user-1"),
    email: "reporter@atlas.test",
    emailVerified: false,
    role: "user",
    identities: [],
    profile: emptyProfile(),
    createdAt: new Date("2026-08-31T10:00:00Z"),
  };

  await issueVerification(tokens, email, { webAppUrl: "https://atlas.test" }, user);

  const token = saved[0]?.token;
  expect(token).toBeString();
  expect(delivered[0]?.text).toContain(`https://atlas.test/verify-email?token=${token}`);
  expect(delivered[0]?.text).toContain("before starting an inquiry");
});
