import type { Logger } from "@atlas/infra/logger";

export interface ConsumeLoopDeps {
  drainOnce: () => Promise<void>;
  isRunning: () => boolean;
  stopRequested: Promise<void>;
  shutdownGraceMs: number;
  errorBackoffMs: number;
  log: Logger;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function settleWithinGrace(drain: Promise<void>, deps: ConsumeLoopDeps): Promise<void> {
  const settled = drain.then(
    () => true,
    (error: unknown) => {
      deps.log.error({ err: error }, "inquiry consume loop failed");
      return true;
    },
  );
  const graceful = await Promise.race([settled, delay(deps.shutdownGraceMs).then(() => false)]);
  if (!graceful) deps.log.warn({}, "inquiry drain did not settle before shutdown, abandoning it");
}

export async function runConsumeLoop(deps: ConsumeLoopDeps): Promise<void> {
  const stopping = deps.stopRequested.then(() => "stop" as const);
  while (deps.isRunning()) {
    const drain = deps.drainOnce();
    try {
      const winner = await Promise.race([drain.then(() => "drained" as const), stopping]);
      if (winner === "stop") return settleWithinGrace(drain, deps);
    } catch (error) {
      deps.log.error({ err: error }, "inquiry consume loop failed");
      await delay(deps.errorBackoffMs);
    }
  }
}
