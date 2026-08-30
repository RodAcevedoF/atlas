import { GRANTABLE_ROLES } from "@atlas/domain";
import type { FastifyInstance } from "fastify";
import { requireRole } from "../core/auth-hook.ts";
import type { UsersDeps } from "../modules/users/dependencies.ts";
import {
  parseAdminUserCreate,
  parseAdminUserEmail,
  parseAdminUserPassword,
  parseGrantableRole,
  parseUserId,
} from "../modules/users/request.ts";

const adminUserSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["email", "password", "role"],
    properties: {
      email: { type: "string", maxLength: 254 },
      password: { type: "string", maxLength: 200 },
      role: { type: "string", enum: GRANTABLE_ROLES },
    },
  },
} as const;

const emailUpdateSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["email"],
    properties: { email: { type: "string", maxLength: 254 } },
  },
} as const;

const passwordResetSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["password"],
    properties: { password: { type: "string", maxLength: 200 } },
  },
} as const;

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
  app.post("/users", { schema: adminUserSchema }, async (req, reply) => {
    const actor = requireRole(req, "super_admin");
    const input = parseAdminUserCreate(req.body as Record<string, unknown> | undefined);
    const user = await deps.createUser.execute({ actor, ...input });
    return reply.code(201).send({ user });
  });

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

  app.patch("/users/:id/email", { schema: emailUpdateSchema }, async (req, reply) => {
    const actor = requireRole(req, "super_admin");
    const params = req.params as { id?: string };
    await deps.updateUserEmail.execute({
      actor,
      targetUserId: parseUserId(params.id),
      email: parseAdminUserEmail(req.body as Record<string, unknown> | undefined),
    });
    return reply.code(204).send();
  });

  app.put("/users/:id/password", { schema: passwordResetSchema }, async (req, reply) => {
    const actor = requireRole(req, "super_admin");
    const params = req.params as { id?: string };
    await deps.resetUserPassword.execute({
      actor,
      targetUserId: parseUserId(params.id),
      password: parseAdminUserPassword(req.body as Record<string, unknown> | undefined),
    });
    return reply.code(204).send();
  });

  app.delete("/users/:id", async (req, reply) => {
    const actor = requireRole(req, "super_admin");
    const params = req.params as { id?: string };
    await deps.deleteUser.execute({ actor, targetUserId: parseUserId(params.id) });
    return reply.code(204).send();
  });
}
