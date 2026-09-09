import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export async function registerRequestSecurity(
  app: FastifyInstance,
  origins: string[] | false,
): Promise<void> {
  await app.register(cors, {
    origin: origins,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"],
  });

  app.addHook("onRequest", (request, reply, done) => {
    if (SAFE_METHODS.has(request.method) || request.headers["x-atlas-request"] === "1") {
      done();
      return;
    }

    reply.code(403).send({ error: "Invalid request" });
  });
}
