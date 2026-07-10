import type { FastifyInstance } from "fastify";
import type { RawQuery } from "../core/parsing.ts";
import {
  parseWorldEventsQuery,
  parseWorldScanBody,
  parseWorldScanHistoryQuery,
  parseWorldTopicsQuery,
} from "../modules/world/request.ts";
import type { IWorldService } from "../modules/world/service.ts";

export async function registerWorldRoutes(
  app: FastifyInstance,
  service: IWorldService,
): Promise<void> {
  app.get("/world/topics", async (req, reply) => {
    const query = (req.query as RawQuery | undefined) ?? {};
    const result = await service.listWorldTopics(parseWorldTopicsQuery(query));
    return reply.send(result);
  });

  app.get("/world/events", async (req, reply) => {
    const query = (req.query as RawQuery | undefined) ?? {};
    const result = await service.listWorldEvents(parseWorldEventsQuery(query));
    return reply.send(result);
  });

  app.post("/world/scan", async (req, reply) => {
    const body = (req.body as Record<string, unknown> | undefined) ?? {};
    const result = await service.runWorldScan(parseWorldScanBody(body));
    return reply.send(result);
  });

  app.get("/world/scan/history", async (req, reply) => {
    const query = (req.query as RawQuery | undefined) ?? {};
    const result = await service.listWorldScanReports(parseWorldScanHistoryQuery(query));
    return reply.send(result);
  });
}
