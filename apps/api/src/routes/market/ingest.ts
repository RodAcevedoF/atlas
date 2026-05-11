import type { FastifyInstance } from "fastify";
import type { IngestMarketsInput } from "@atlas/application";
import type { AppDeps } from "../../core/bootstrap.ts";

export async function registerMarketRoutes(app: FastifyInstance, deps: AppDeps): Promise<void> {
  app.post("/market/ingest", async (req, reply) => {
    const input = (req.body as IngestMarketsInput | undefined) ?? {};
    const result = await deps.marketService.ingestMarkets(input);
    return reply.send(result);
  });
}
