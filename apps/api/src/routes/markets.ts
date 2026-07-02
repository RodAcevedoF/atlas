import type { IngestMarketsInput } from "@atlas/application";
import type { FastifyInstance } from "fastify";
import type { RawQuery } from "../core/parsing.ts";
import {
  parseListEventsQuery,
  parseListMarketsQuery,
  parseRegionSummariesQuery,
} from "../modules/markets/request.ts";
import type { IMarketsService } from "../modules/markets/service.ts";

export async function registerMarketsRoutes(
  app: FastifyInstance,
  service: IMarketsService,
): Promise<void> {
  app.post("/market/ingest", async (req, reply) => {
    const input = (req.body as IngestMarketsInput | undefined) ?? {};
    const result = await service.ingestMarkets(input);
    return reply.send(result);
  });

  app.get("/markets", async (req, reply) => {
    const query = (req.query as RawQuery | undefined) ?? {};
    const result = await service.listMarkets(parseListMarketsQuery(query));
    return reply.send(result);
  });

  app.get("/events", async (req, reply) => {
    const query = (req.query as RawQuery | undefined) ?? {};
    const result = await service.listEvents(parseListEventsQuery(query));
    return reply.send(result);
  });

  app.get("/regions/summary", async (req, reply) => {
    const query = (req.query as RawQuery | undefined) ?? {};
    const result = await service.listRegionSummaries(parseRegionSummariesQuery(query));
    return reply.send(result);
  });
}
