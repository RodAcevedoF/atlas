import type { FastifyInstance } from "fastify";
import type { RawQuery } from "../core/parsing.ts";
import type { NewsDeps } from "../modules/news/dependencies.ts";
import { parseIngestNewsBody } from "../modules/news/request.ts";

export async function registerNewsRoutes(app: FastifyInstance, deps: NewsDeps): Promise<void> {
  app.post("/world/news/ingest", async (req, reply) => {
    const body = (req.body as RawQuery | undefined) ?? {};
    const result = await deps.ingestNews.execute(parseIngestNewsBody(body));
    return reply.send(result);
  });
}
