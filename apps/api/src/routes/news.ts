import type { FastifyInstance } from "fastify";
import type { RawQuery } from "../core/parsing.ts";
import { parseIngestNewsBody } from "../modules/news/request.ts";
import type { INewsService } from "../modules/news/service.ts";

export async function registerNewsRoutes(
  app: FastifyInstance,
  service: INewsService,
): Promise<void> {
  app.post("/world/news/ingest", async (req, reply) => {
    const body = (req.body as RawQuery | undefined) ?? {};
    const result = await service.ingestNews(parseIngestNewsBody(body));
    return reply.send(result);
  });
}
