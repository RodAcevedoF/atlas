import { expect, test } from "bun:test";
import { emptyProfile, makeUserId } from "@atlas/domain";
import Fastify from "fastify";
import { inMemoryProfileImageStore } from "../../../../packages/application/src/testing/profile-image-store.fake.ts";
import { inMemoryUserStore } from "../../../../packages/application/src/testing/user-store.fake.ts";
import { makeProfileDependencies } from "../modules/profile/dependencies.ts";
import { registerProfileRoutes } from "./profile.ts";

for (const hasImage of [false, true]) {
  test(`profile image read returns ${hasImage ? "the stored bytes" : "an empty success"}`, async () => {
    const userId = makeUserId("profile-reader");
    const store = inMemoryProfileImageStore();
    const bytes = new Uint8Array([137, 80, 78, 71]);
    if (hasImage) await store.replaceProfileImage(userId, { mediaType: "image/png", bytes });
    const app = Fastify();
    app.decorateRequest("user", null);
    app.addHook("onRequest", async (request) => {
      request.user = {
        id: userId,
        email: "reader@example.test",
        emailVerified: true,
        role: "user",
        profile: emptyProfile(),
      };
    });
    await registerProfileRoutes(
      app,
      makeProfileDependencies({
        userStore: inMemoryUserStore().store,
        profileImageStore: store,
      }),
    );

    try {
      const response = await app.inject({ method: "GET", url: "/profile/image" });

      expect(response.statusCode).toBe(hasImage ? 200 : 204);
      expect(response.headers["cache-control"]).toBe("private, no-store");
      expect(response.rawPayload).toEqual(hasImage ? Buffer.from(bytes) : Buffer.alloc(0));
      if (hasImage) expect(response.headers["content-type"]).toBe("image/png");
    } finally {
      await app.close();
    }
  });
}
