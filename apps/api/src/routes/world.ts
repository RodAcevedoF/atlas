import type { FastifyInstance } from "fastify";
import type { RawQuery } from "../core/parsing.ts";
import { parseWorldEventsQuery, parseWorldTopicsQuery } from "../modules/world/request.ts";
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
}
