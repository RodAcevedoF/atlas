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
  app.put("/profile", { schema: profileUpdateSchema }, async (req, reply) => {
    const user = requireUser(req);
    const body = req.body as Record<string, unknown> | undefined;
    const profile = await deps.updateProfile.execute(user.id, parseProfileUpdate(body));
    return reply.send({ profile });
  });
}
