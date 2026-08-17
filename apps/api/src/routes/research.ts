import type { FastifyInstance } from "fastify";
import type { RawQuery } from "../core/parsing.ts";
import type { ResearchDeps } from "../modules/research/dependencies.ts";
import {
  parseResearchRunBody,
  parseResearchRunId,
  parseResearchRunsQuery,
} from "../modules/research/request.ts";

export async function registerResearchRoutes(
  app: FastifyInstance,
  deps: ResearchDeps,
): Promise<void> {
  app.post("/research/runs", async (req, reply) => {
    const body = req.body as Record<string, unknown> | undefined;
    const result = await deps.requestResearchRun.execute(parseResearchRunBody(body));
    return reply.code(202).send(result);
  });

  app.get("/research/runs/:id", async (req, reply) => {
    const params = req.params as { id?: string };
    const run = await deps.getResearchRun.execute(parseResearchRunId(params.id));
    if (!run) return reply.code(404).send({ error: "Research run not found" });
    return reply.send(run);
  });

  app.get("/research/runs", async (req, reply) => {
    const query = (req.query as RawQuery | undefined) ?? {};
    const runs = await deps.listResearchRuns.execute(parseResearchRunsQuery(query));
    return reply.send(runs);
  });
}
