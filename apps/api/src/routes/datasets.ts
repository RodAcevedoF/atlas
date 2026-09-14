import { DATASET_MAX_BYTES, datasetCsv } from "@atlas/application";
import type { FastifyInstance } from "fastify";
import { requireUser } from "../core/auth-hook.ts";
import type { DatasetDeps } from "../modules/datasets/dependencies.ts";
import { parseAttachmentFilename } from "../modules/inquiry/request.ts";

export async function registerDatasetRoutes(
  app: FastifyInstance,
  deps: DatasetDeps,
): Promise<void> {
  app.post(
    "/datasets",
    { bodyLimit: DATASET_MAX_BYTES, config: { rateLimit: { max: 20, timeWindow: "1 hour" } } },
    async (req, reply) => {
      const dataset = await deps.importDataset.execute({
        ownerId: requireUser(req).id,
        filename: parseAttachmentFilename(req.headers["x-atlas-filename"]),
        mediaType: req.headers["content-type"]?.split(";", 1)[0] ?? "",
        bytes: req.body instanceof Uint8Array ? req.body : new Uint8Array(),
      });
      return reply.code(201).send(dataset);
    },
  );
  app.get("/datasets", async (req, reply) =>
    reply.send(await deps.listDatasets.execute(requireUser(req).id)),
  );
  app.get<{ Params: { id: string } }>("/datasets/:id", async (req, reply) => {
    const saved = await deps.getDataset.execute(req.params.id, requireUser(req).id);
    if (!saved) return reply.code(404).send({ error: "Dataset not found" });
    return reply.header("Cache-Control", "private, no-store").send(saved);
  });
  app.get<{ Params: { id: string } }>("/datasets/:id/csv", async (req, reply) => {
    const saved = await deps.getDataset.execute(req.params.id, requireUser(req).id);
    if (!saved) return reply.code(404).send({ error: "Dataset not found" });
    return reply
      .header("Cache-Control", "private, no-store")
      .type("text/csv; charset=utf-8")
      .header("Content-Disposition", 'attachment; filename="dataset.csv"')
      .send(
        datasetCsv({
          columns: saved.dataset.columns,
          rows: saved.records.map((record) => record.values),
        }),
      );
  });
  app.delete<{ Params: { id: string } }>("/datasets/:id", async (req, reply) => {
    await deps.deleteDataset.execute(req.params.id, requireUser(req).id);
    return reply.code(204).send();
  });
}
