import { SESSION_TTL_MS } from "@atlas/application";
import type { FastifyInstance, FastifyReply } from "fastify";
import { SESSION_COOKIE } from "../core/auth-hook.ts";
import { parseCredentials, parseLoginCredentials } from "../modules/auth/request.ts";
import type { IAuthService } from "../modules/auth/service.ts";

function setSessionCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function registerAuthRoutes(
  app: FastifyInstance,
  service: IAuthService,
): Promise<void> {
  app.post("/auth/register", async (req, reply) => {
    const credentials = parseCredentials(req.body as Record<string, unknown> | undefined);
    const result = await service.register(credentials);
    setSessionCookie(reply, result.token);
    return reply.send({ user: result.user });
  });

  app.post("/auth/login", async (req, reply) => {
    const credentials = parseLoginCredentials(req.body as Record<string, unknown> | undefined);
    const result = await service.login(credentials);
    setSessionCookie(reply, result.token);
    return reply.send({ user: result.user });
  });

  app.post("/auth/logout", async (req, reply) => {
    const token = req.cookies[SESSION_COOKIE];
    if (token) await service.logout(token);
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return reply.send({ ok: true });
  });

  app.get("/auth/me", async (req, reply) => {
    return reply.send({ user: req.user });
  });
}
