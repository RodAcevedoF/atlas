import { GRANTABLE_ROLES } from "@atlas/domain";
import type { FastifyInstance } from "fastify";
import { requireRole } from "../core/auth-hook.ts";
import type { UsersDeps } from "../modules/users/dependencies.ts";
import { parseGrantableRole, parseUserId } from "../modules/users/request.ts";

const roleUpdateSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["role"],
    properties: {
      role: { type: "string", enum: GRANTABLE_ROLES },
    },
  },
} as const;

export async function registerUserRoutes(app: FastifyInstance, deps: UsersDeps): Promise<void> {
  app.put("/users/:id/role", { schema: roleUpdateSchema }, async (req, reply) => {
    const actor = requireRole(req, "super_admin");
    const params = req.params as { id?: string };
    const body = req.body as Record<string, unknown> | undefined;

    const user = await deps.changeUserRole.execute({
      actor,
      targetUserId: parseUserId(params.id),
      role: parseGrantableRole(body),
    });
    return reply.send({ user });
  });
}
