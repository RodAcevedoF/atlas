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

const reportIdSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", minLength: 1, maxLength: 128 } },
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

  app.get("/profile/reports", async (req, reply) => {
    const user = requireUser(req);
    const reports = await deps.listSavedReports.execute(user.id);
    return reply.send({ reports });
  });

  app.post("/profile/reports/:id", { schema: reportIdSchema }, async (req, reply) => {
    const user = requireUser(req);
    const { id } = req.params as { id: string };
    const profile = await deps.saveReport.execute(user.id, id);
    return reply.send({ profile });
  });

  app.delete("/profile/reports/:id", { schema: reportIdSchema }, async (req, reply) => {
    const user = requireUser(req);
    const { id } = req.params as { id: string };
    const profile = await deps.unsaveReport.execute(user.id, id);
    return reply.send({ profile });
  });
}
