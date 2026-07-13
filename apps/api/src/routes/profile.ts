import type { FastifyInstance } from "fastify";
import { requireUser } from "../core/auth-hook.ts";
import { parseProfileUpdate } from "../modules/profile/request.ts";
import type { IProfileService } from "../modules/profile/service.ts";

export async function registerProfileRoutes(
  app: FastifyInstance,
  service: IProfileService,
): Promise<void> {
  app.put("/profile", async (req, reply) => {
    const user = requireUser(req);
    const body = req.body as Record<string, unknown> | undefined;
    const profile = await service.updateProfile(user.id, parseProfileUpdate(body));
    return reply.send({ profile });
  });

  app.get("/profile/reports", async (req, reply) => {
    const user = requireUser(req);
    const reports = await service.listSavedReports(user.id);
    return reply.send({ reports });
  });

  app.post("/profile/reports/:id", async (req, reply) => {
    const user = requireUser(req);
    const { id } = req.params as { id: string };
    const profile = await service.saveReport(user.id, id);
    return reply.send({ profile });
  });

  app.delete("/profile/reports/:id", async (req, reply) => {
    const user = requireUser(req);
    const { id } = req.params as { id: string };
    const profile = await service.unsaveReport(user.id, id);
    return reply.send({ profile });
  });
}
