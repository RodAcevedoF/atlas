import type { IngestMarketsInput } from "@atlas/application";
import type { FastifyInstance } from "fastify";
import type { RawQuery } from "../core/parsing.ts";
import type { MarketsDeps } from "../modules/markets/dependencies.ts";
import {
  parseListEventsQuery,
  parseListMarketsQuery,
  parseRegionSummariesQuery,
} from "../modules/markets/request.ts";

export async function registerMarketsRoutes(
  app: FastifyInstance,
  deps: MarketsDeps,
): Promise<void> {
  app.post("/market/ingest", async (req, reply) => {
    const input = (req.body as IngestMarketsInput | undefined) ?? {};
    const result = await deps.ingestMarkets.execute(input);
    return reply.send(result);
  });

  app.get("/markets", async (req, reply) => {
    const query = (req.query as RawQuery | undefined) ?? {};
    const result = await deps.listMarkets.execute(parseListMarketsQuery(query));
    return reply.send(result);
  });

  app.get("/events", async (req, reply) => {
    const query = (req.query as RawQuery | undefined) ?? {};
    const result = await deps.listEvents.execute(parseListEventsQuery(query));
    return reply.send(result);
  });

  app.get("/regions/summary", async (req, reply) => {
    const query = (req.query as RawQuery | undefined) ?? {};
    const result = await deps.listRegionSummaries.execute(parseRegionSummariesQuery(query));
    return reply.send(result);
  });
}
