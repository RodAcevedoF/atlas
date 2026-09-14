import { expect, test } from "bun:test";
import { AuthenticateUseCase, StreamInquiryRunUseCase } from "@atlas/application";
import { emptyProfile, makeSessionToken, makeUserId } from "@atlas/domain";
import Fastify from "fastify";
import { MemorySessions } from "../../../../../packages/application/src/auth/testing/sessions.ts";
import { inMemoryInquiryRunStore } from "../../../../../packages/application/src/testing/inquiry-run-store.fake.ts";
import { fakeSubscriptions } from "../../../../../packages/application/src/testing/inquiry-run-subscriptions.fake.ts";
import { inquiryRun } from "../../../../../packages/application/src/testing/inquiry-run.builder.ts";
import { inMemoryUserStore } from "../../../../../packages/application/src/testing/user-store.fake.ts";
import { writeInquiryRunStream } from "./run-events.ts";

for (const [action, delivery] of [
  ["logout", "idle"],
  ["password-reset", "idle"],
  ["role-change", "idle"],
  ["auth-outage", "idle"],
  ["logout", "snapshot"],
  ["password-reset", "snapshot"],
  ["role-change", "snapshot"],
] as const) {
  test(`an SSE connection closes after ${action} during ${delivery} delivery and releases its subscription`, async () => {
    const user = {
      id: makeUserId("user-1"),
      email: "owner@example.test",
      emailVerified: true,
      role: "admin" as const,
      profile: emptyProfile(),
      identities: [],
      createdAt: new Date(),
    };
    const users = inMemoryUserStore([user]).store;
    const sessions = new MemorySessions();
    const token = makeSessionToken("test-session");
    await sessions.create({
      token,
      userId: user.id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });
    const authenticate = new AuthenticateUseCase(sessions, users);
    const run = inquiryRun();
    const { store } = inMemoryInquiryRunStore([run]);
    const subscriptions = fakeSubscriptions();
    const useCase = new StreamInquiryRunUseCase(store, subscriptions.subscriptions);
    let ready = (): void => {
      throw new Error("Readiness was not initialized");
    };
    const firstDelivered = new Promise<void>((resolve) => {
      ready = resolve;
    });
    let outage = false;
    const app = Fastify();
    app.get("/events", async (_request, reply) => {
      const stream = await useCase.execute(run.id, user);
      if (!stream) throw new Error("Expected a stream");
      return writeInquiryRunStream(
        reply,
        {
          snapshots: (async function* () {
            for await (const snapshot of stream.snapshots) {
              yield snapshot;
              ready();
            }
          })(),
          close: () => stream.close(),
        },
        async () => {
          if (outage) return new Promise<boolean>(() => undefined);
          const current = await authenticate.execute(token);
          return current !== null && current.id === user.id && current.role === user.role;
        },
        10,
        10,
      );
    });
    try {
      const response = app.inject("/events");
      const completed = response.then((result) => result);
      await firstDelivered;
      if (action === "logout") await sessions.delete(token);
      if (action === "role-change") await users.updateRole(user.id, "user");
      if (action === "password-reset")
        await users.replacePasswordAndInvalidateSessions(user.id, {
          provider: "password",
          providerUserId: user.id,
          email: user.email,
          secret: "replacement",
        });
      outage = action === "auth-outage";
      if (delivery === "snapshot") {
        await store.applyInquiryRunCheckpoint({
          id: run.id,
          attempt: 0,
          sequence: 1,
          occurredAt: new Date(),
          stage: "map_ready",
          places: [],
          claimCount: 3,
          unplacedClaims: 0,
        });
        subscriptions.announce(run.id);
      }

      const result = await completed;

      expect(result.statusCode).toBe(200);
      expect(result.body.split("data:")).toHaveLength(2);
      expect(subscriptions.openCount()).toBe(0);
    } finally {
      await app.close();
    }
  });
}
