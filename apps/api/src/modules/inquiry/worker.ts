import type { FastifyInstance } from "fastify";
import type { InquiryDeps } from "./dependencies.ts";

async function tick(app: FastifyInstance, deps: InquiryDeps): Promise<void> {
  try {
    const { runId, status } = await deps.executeInquiryRun.execute();
    if (runId) app.log.info({ runId, status }, "inquiry run finished");
  } catch (error) {
    app.log.error({ err: error }, "inquiry worker tick failed");
  }
}

export function registerInquiryWorker(app: FastifyInstance, deps: InquiryDeps): void {
  let inFlight = false;

  const timer = setInterval(() => {
    if (inFlight) return;
    inFlight = true;
    void tick(app, deps).finally(() => {
      inFlight = false;
    });
  }, deps.pollIntervalMs);
  timer.unref();

  app.addHook("onClose", () => {
    clearInterval(timer);
  });
}
