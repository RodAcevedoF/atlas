import type { FastifyInstance } from "fastify";
import { requireUser } from "../core/auth-hook.ts";
import type { RawQuery } from "../core/parsing.ts";
import type { InquiryDeps } from "../modules/inquiry/dependencies.ts";
import {
  parseAttachmentFilename,
  parseAttachmentInterpretationBody,
  parseInquiryAttachmentId,
  parseInquiryRunBody,
  parseInquiryRunId,
  parseInquiryRunsQuery,
} from "../modules/inquiry/request.ts";

export async function registerInquiryRoutes(
  app: FastifyInstance,
  deps: InquiryDeps,
): Promise<void> {
  app.post("/inquiry/attachments", async (req, reply) => {
    const user = requireUser(req);
    const mediaType = req.headers["content-type"]?.split(";", 1)[0] ?? "";
    const filename = parseAttachmentFilename(req.headers["x-atlas-filename"]);
    const bytes = req.body instanceof Uint8Array ? req.body : new Uint8Array();
    const attachment = await deps.uploadInquiryAttachment.execute({
      ownerId: user.id,
      filename,
      mediaType,
      bytes,
    });
    return reply.code(201).send(attachment);
  });

  app.post("/inquiry/attachments/:id/interpret", async (req, reply) => {
    const user = requireUser(req);
    const params = req.params as { id?: string };
    const body = req.body as Record<string, unknown> | undefined;
    const interpretation = await deps.interpretInquiryAttachment.execute({
      id: parseInquiryAttachmentId(params.id),
      ownerId: user.id,
      question: parseAttachmentInterpretationBody(body),
    });
    return reply.send(interpretation);
  });

  app.delete("/inquiry/attachments/:id", async (req, reply) => {
    const user = requireUser(req);
    const params = req.params as { id?: string };
    await deps.deleteInquiryAttachment.execute(parseInquiryAttachmentId(params.id), user.id);
    return reply.code(204).send();
  });

  app.post("/inquiry/runs", async (req, reply) => {
    const user = requireUser(req);
    const body = req.body as Record<string, unknown> | undefined;
    const result = await deps.requestInquiryRun.execute({
      ...parseInquiryRunBody(body),
      ownerId: user.id,
      role: user.role,
      emailVerified: user.emailVerified,
    });
    return reply.code(202).send(result);
  });

  app.get("/inquiry/budget", async (req, reply) => {
    const user = requireUser(req);
    return reply.send(await deps.getInquiryBudget.execute({ ownerId: user.id, role: user.role }));
  });

  app.get("/inquiry/runs/:id", async (req, reply) => {
    const user = requireUser(req);
    const params = req.params as { id?: string };
    const run = await deps.getInquiryRun.execute(parseInquiryRunId(params.id), user);
    if (!run) return reply.code(404).send({ error: "Inquiry run not found" });
    return reply.send(run);
  });

  app.delete("/inquiry/runs/:id", async (req, reply) => {
    const user = requireUser(req);
    const params = req.params as { id?: string };
    const outcome = await deps.deleteInquiryRun.execute(parseInquiryRunId(params.id), user);
    if (outcome === "pinned") {
      return reply.code(409).send({ error: "The pinned run backs the map and cannot be deleted" });
    }
    if (outcome === "not_found") return reply.code(404).send({ error: "Inquiry run not found" });
    if (outcome === "forbidden") {
      return reply.code(403).send({ error: "Only the owner can delete this inquiry" });
    }
    return reply.code(204).send();
  });

  app.get("/inquiry/runs", async (req, reply) => {
    const user = requireUser(req);
    const query = (req.query as RawQuery | undefined) ?? {};
    const runs = await deps.listInquiryRuns.execute(user, parseInquiryRunsQuery(query));
    return reply.send(runs);
  });
}
