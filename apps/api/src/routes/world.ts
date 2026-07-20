import type { FastifyInstance } from "fastify";
import { requireUser } from "../core/auth-hook.ts";
import type { RawQuery } from "../core/parsing.ts";
import type { WorldDeps } from "../modules/world/dependencies.ts";
import {
  applyScanDefaults,
  parseWorldEventsQuery,
  parseWorldScanBody,
  parseWorldScanHistoryQuery,
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

  app.post("/world/scan", async (req, reply) => {
    const user = requireUser(req);
    if (!user.emailVerified) {
      return reply.code(403).send({ error: "Verify your email to run world scans" });
    }
    const body = (req.body as Record<string, unknown> | undefined) ?? {};
    const input = applyScanDefaults(parseWorldScanBody(body), user.profile);
    const result = await deps.runWorldScan.execute(input);
    return reply.send(result);
  });

  app.get("/world/scan/history", async (req, reply) => {
    const query = (req.query as RawQuery | undefined) ?? {};
    const result = await deps.listWorldScanReports.execute(parseWorldScanHistoryQuery(query));
    return reply.send(result);
  });
}
