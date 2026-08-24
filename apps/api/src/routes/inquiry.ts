import type { FastifyInstance } from "fastify";
import type { RawQuery } from "../core/parsing.ts";
import type { InquiryDeps } from "../modules/inquiry/dependencies.ts";
import {
  parseInquiryRunBody,
  parseInquiryRunId,
  parseInquiryRunsQuery,
} from "../modules/inquiry/request.ts";

export async function registerInquiryRoutes(
  app: FastifyInstance,
  deps: InquiryDeps,
): Promise<void> {
  app.post("/inquiry/runs", async (req, reply) => {
    const body = req.body as Record<string, unknown> | undefined;
    const result = await deps.requestInquiryRun.execute(parseInquiryRunBody(body));
    return reply.code(202).send(result);
  });

  app.get("/inquiry/runs/:id", async (req, reply) => {
    const params = req.params as { id?: string };
    const run = await deps.getInquiryRun.execute(parseInquiryRunId(params.id));
    if (!run) return reply.code(404).send({ error: "Inquiry run not found" });
    return reply.send(run);
  });

  app.delete("/inquiry/runs/:id", async (req, reply) => {
    const params = req.params as { id?: string };
    const outcome = await deps.deleteInquiryRun.execute(parseInquiryRunId(params.id));
    if (outcome === "pinned") {
      return reply.code(409).send({ error: "The pinned run backs the map and cannot be deleted" });
    }
    if (outcome === "not_found") return reply.code(404).send({ error: "Inquiry run not found" });
    return reply.code(204).send();
  });

  app.get("/inquiry/runs", async (req, reply) => {
    const query = (req.query as RawQuery | undefined) ?? {};
    const runs = await deps.listInquiryRuns.execute(parseInquiryRunsQuery(query));
    return reply.send(runs);
  });
}
