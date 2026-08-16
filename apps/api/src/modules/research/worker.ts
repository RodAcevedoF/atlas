import type { FastifyInstance } from "fastify";
import type { ResearchDeps } from "./dependencies.ts";

async function tick(app: FastifyInstance, deps: ResearchDeps): Promise<void> {
  try {
    const { runId, status } = await deps.executeResearchRun.execute();
    if (runId) app.log.info({ runId, status }, "research run finished");
  } catch (error) {
    app.log.error({ err: error }, "research worker tick failed");
  }
}

export function registerResearchWorker(app: FastifyInstance, deps: ResearchDeps): void {
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
