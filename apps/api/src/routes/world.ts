import type { FastifyInstance } from "fastify";
import type { RawQuery } from "../core/parsing.ts";
import type { WorldDeps } from "../modules/world/dependencies.ts";
import {
  parseWorldEventsQuery,
  parseWorldSnapshotsQuery,
  parseWorldTopicsQuery,
} from "../modules/world/request.ts";

export async function registerWorldRoutes(app: FastifyInstance, deps: WorldDeps): Promise<void> {
  app.get("/world/topics", async (req, reply) => {
    const query = (req.query as RawQuery | undefined) ?? {};
    const result = await deps.listWorldTopics.execute(parseWorldTopicsQuery(query));
    return reply.send(result);
  });

  app.get("/world/events", async (req, reply) => {
    const query = (req.query as RawQuery | undefined) ?? {};
    const result = await deps.listWorldEvents.execute(parseWorldEventsQuery(query));
    return reply.send(result);
  });

  app.get("/world/snapshots", async (req, reply) => {
    const query = (req.query as RawQuery | undefined) ?? {};
    const result = await deps.listWorldSnapshots.execute(parseWorldSnapshotsQuery(query));
    return reply.send(result);
  });
}
