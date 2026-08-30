import { ADMIN_USER_PAGE_DEFAULT } from "@atlas/application";
import type { FastifyInstance } from "fastify";
import { requireAtLeastRole } from "../core/auth-hook.ts";
import { parseLimit } from "../core/parsing.ts";
import type { AdminDeps } from "../modules/admin/dependencies.ts";

export async function registerAdminRoutes(app: FastifyInstance, deps: AdminDeps): Promise<void> {
  app.get("/admin/analytics", async (req, reply) => {
    requireAtLeastRole(req, "admin");
    return reply.send(await deps.getAdminAnalytics.execute());
  });

  app.get("/admin/users", async (req, reply) => {
    requireAtLeastRole(req, "admin");
    const query = req.query as { limit?: unknown; cursor?: unknown };
    const cursor = typeof query.cursor === "string" && query.cursor ? query.cursor : undefined;
    return reply.send(
      await deps.listAdminUsers.execute({
        limit: parseLimit(query.limit) ?? ADMIN_USER_PAGE_DEFAULT,
        cursor,
      }),
    );
  });
}
