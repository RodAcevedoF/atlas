import type { FastifyInstance } from "fastify";
import { requireAtLeastRole } from "../core/auth-hook.ts";
import type { AdminDeps } from "../modules/admin/dependencies.ts";

export async function registerAdminRoutes(app: FastifyInstance, deps: AdminDeps): Promise<void> {
  app.get("/admin/analytics", async (req, reply) => {
    requireAtLeastRole(req, "admin");
    return reply.send(await deps.getAdminAnalytics.execute());
  });
}
