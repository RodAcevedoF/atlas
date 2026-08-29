import { PROFILE_IMAGE_MAX_BYTES, PROFILE_IMAGE_MEDIA_TYPES } from "@atlas/application";
import type { FastifyInstance } from "fastify";
import { requireUser } from "../core/auth-hook.ts";
import type { ProfileDeps } from "../modules/profile/dependencies.ts";
import { parseProfileUpdate } from "../modules/profile/request.ts";

const profileUpdateSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    properties: {
      preferredRegions: { type: "array", items: { type: "string" }, maxItems: 50 },
      preferredTopics: { type: "array", items: { type: "string" }, maxItems: 50 },
    },
  },
} as const;

export async function registerProfileRoutes(
  app: FastifyInstance,
  deps: ProfileDeps,
): Promise<void> {
  app.addContentTypeParser(
    [...PROFILE_IMAGE_MEDIA_TYPES],
    { parseAs: "buffer", bodyLimit: PROFILE_IMAGE_MAX_BYTES },
    (_req, body, done) => done(null, body),
  );

  app.put("/profile", { schema: profileUpdateSchema }, async (req, reply) => {
    const user = requireUser(req);
    const body = req.body as Record<string, unknown> | undefined;
    const profile = await deps.updateProfile.execute(user.id, parseProfileUpdate(body));
    return reply.send({ profile });
  });

  app.get("/profile/image", async (req, reply) => {
    const user = requireUser(req);
    const image = await deps.getProfileImage.execute(user.id);
    if (!image) return reply.code(404).send({ error: "Profile image not found" });

    return reply
      .header("Cache-Control", "private, no-store")
      .type(image.mediaType)
      .send(Buffer.from(image.bytes));
  });

  app.put("/profile/image", async (req, reply) => {
    const user = requireUser(req);
    const mediaType = req.headers["content-type"]?.split(";", 1)[0] ?? "";
    const bytes = req.body instanceof Uint8Array ? req.body : new Uint8Array();
    await deps.uploadProfileImage.execute(user.id, { mediaType, bytes });
    return reply.code(204).send();
  });

  app.delete("/profile/image", async (req, reply) => {
    const user = requireUser(req);
    await deps.deleteProfileImage.execute(user.id);
    return reply.code(204).send();
  });
}
