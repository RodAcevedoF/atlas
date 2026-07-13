import { EmailInUseError, InvalidCredentialsError, UserNotFoundError } from "@atlas/application";
import type { FastifyInstance } from "fastify";
import { InvalidInputError } from "./errors.ts";

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, req, reply) => {
    if (error instanceof InvalidInputError) return reply.code(400).send({ error: error.message });
    if (error instanceof InvalidCredentialsError) {
      return reply.code(401).send({ error: error.message });
    }
    if (error instanceof EmailInUseError) return reply.code(409).send({ error: error.message });
    if (error instanceof UserNotFoundError) return reply.code(404).send({ error: error.message });

    req.log.error(error);
    return reply.code(500).send({ error: "Internal server error" });
  });
}
