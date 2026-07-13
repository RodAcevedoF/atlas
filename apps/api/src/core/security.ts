import type { createRedisClient } from "@atlas/infra/session-redis";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";

type RedisClient = ReturnType<typeof createRedisClient>;

const GLOBAL_MAX = 100;
const GLOBAL_WINDOW = "1 minute";

export const loggerRedactPaths = [
  "req.headers.cookie",
  "req.headers.authorization",
  "res.headers['set-cookie']",
  "req.body.password",
];

function corsOrigin(): string[] | false {
  const origins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length > 0 ? origins : false;
}

export async function registerSecurity(app: FastifyInstance, redis: RedisClient): Promise<void> {
  await app.register(cors, { origin: corsOrigin(), credentials: true });
  await app.register(helmet);
  await app.register(rateLimit, {
    max: GLOBAL_MAX,
    timeWindow: GLOBAL_WINDOW,
    redis,
    nameSpace: "atlas-rl:",
    // redis is unreachable
    skipOnError: true,
  });
}
