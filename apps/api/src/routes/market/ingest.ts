import type { IngestMarketsInput } from "@atlas/application";
import type { FastifyInstance } from "fastify";
import type { AppDeps } from "../../core/bootstrap.ts";
import {
  parseIngestNewsBody,
  parseListEventsQuery,
  parseListMarketsQuery,
  parseRegionSummariesQuery,
  parseWorldTopicsQuery,
} from "../../modules/market/request.ts";

type RawQuery = Record<string, unknown>;

export async function registerMarketRoutes(app: FastifyInstance, deps: AppDeps): Promise<void> {
  app.post("/market/ingest", async (req, reply) => {
    const input = (req.body as IngestMarketsInput | undefined) ?? {};
    const result = await deps.marketService.ingestMarkets(input);
    return reply.send(result);
  });

  app.get("/markets", async (req, reply) => {
    const query = (req.query as RawQuery | undefined) ?? {};
    const result = await deps.marketService.listMarkets(parseListMarketsQuery(query));
    return reply.send(result);
  });

  app.get("/events", async (req, reply) => {
    const query = (req.query as RawQuery | undefined) ?? {};
    const result = await deps.marketService.listEvents(parseListEventsQuery(query));
    return reply.send(result);
  });

  app.get("/regions/summary", async (req, reply) => {
    const query = (req.query as RawQuery | undefined) ?? {};
    const result = await deps.marketService.listRegionSummaries(parseRegionSummariesQuery(query));
    return reply.send(result);
  });

  app.get("/world/topics", async (req, reply) => {
    const query = (req.query as RawQuery | undefined) ?? {};
    const result = await deps.marketService.listWorldTopics(parseWorldTopicsQuery(query));
    return reply.send(result);
  });

  app.post("/world/news/ingest", async (req, reply) => {
    const body = (req.body as RawQuery | undefined) ?? {};
    const result = await deps.marketService.ingestNews(parseIngestNewsBody(body));
    return reply.send(result);
  });
}
