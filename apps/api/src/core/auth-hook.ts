import type { Authenticate } from "@atlas/application";
import type { PublicUser } from "@atlas/domain";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export const SESSION_COOKIE = "atlas_session";

const PUBLIC_ROUTES = new Set([
  "/health",
  "/auth/register",
  "/auth/login",
  "/auth/logout",
  "/auth/me",
]);

declare module "fastify" {
  interface FastifyRequest {
    user: PublicUser | null;
  }
}

export function registerAuthGate(app: FastifyInstance, authenticate: Authenticate): void {
  app.decorateRequest("user", null);

  app.addHook("onRequest", async (req: FastifyRequest, reply: FastifyReply) => {
    const path = req.url.split("?")[0];
    const token = req.cookies[SESSION_COOKIE];
    req.user = token ? await authenticate.execute(token) : null;

    if (PUBLIC_ROUTES.has(path)) return;
    if (!req.user) {
      return reply.code(401).send({ error: "Authentication required" });
    }
  });
}

export function requireUser(req: FastifyRequest): PublicUser {
  if (!req.user) throw new Error("requireUser called on an unauthenticated request");
  return req.user;
}
