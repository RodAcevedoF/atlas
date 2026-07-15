import { SESSION_TTL_MS } from "@atlas/application";
import type { FastifyInstance, FastifyReply } from "fastify";
import { SESSION_COOKIE } from "../core/auth-hook.ts";
import type { AuthDeps } from "../modules/auth/dependencies.ts";
import { parseCredentials, parseLoginCredentials } from "../modules/auth/request.ts";

const credentialsSchema = {
  body: {
    type: "object",
    required: ["email", "password"],
    additionalProperties: false,
    properties: {
      email: { type: "string", maxLength: 254 },
      password: { type: "string", maxLength: 200 },
    },
  },
} as const;

const authRateLimit = { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } } as const;

function setSessionCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function registerAuthRoutes(app: FastifyInstance, deps: AuthDeps): Promise<void> {
  app.post(
    "/auth/register",
    { schema: credentialsSchema, ...authRateLimit },
    async (req, reply) => {
      const credentials = parseCredentials(req.body as Record<string, unknown> | undefined);
      const result = await deps.registerUser.execute(credentials);
      setSessionCookie(reply, result.token);
      return reply.send({ user: result.user });
    },
  );

  app.post("/auth/login", { schema: credentialsSchema, ...authRateLimit }, async (req, reply) => {
    const credentials = parseLoginCredentials(req.body as Record<string, unknown> | undefined);
    const result = await deps.authenticateWithProvider.execute({
      provider: "password",
      payload: credentials,
    });
    setSessionCookie(reply, result.token);
    return reply.send({ user: result.user });
  });

  app.post("/auth/logout", async (req, reply) => {
    const token = req.cookies[SESSION_COOKIE];
    if (token) await deps.logoutUser.execute(token);
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return reply.send({ ok: true });
  });

  app.get("/auth/me", async (req, reply) => {
    return reply.send({ user: req.user });
  });
}
