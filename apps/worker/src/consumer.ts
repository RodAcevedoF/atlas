import type { ExecuteInquiryRun, InquiryJob, InquiryJobQueuePort } from "@atlas/application";

export interface ConsumerDeps {
  queue: InquiryJobQueuePort;
  executeInquiryRun: ExecuteInquiryRun;
  ownershipRefreshMs: number;
  reclaimIdleMs: number;
  reclaimBatchSize: number;
  log: (fields: Record<string, unknown>, message: string) => void;
}

function heartbeat(deps: ConsumerDeps, job: InquiryJob): () => void {
  const timer = setInterval(() => {
    deps.queue.refreshOwnership(job.deliveryId).catch((error: unknown) => {
      deps.log({ runId: job.runId, err: error }, "inquiry ownership refresh failed");
    });
  }, deps.ownershipRefreshMs);

  return () => clearInterval(timer);
}

async function runJob(deps: ConsumerDeps, job: InquiryJob): Promise<void> {
  const stopHeartbeat = heartbeat(deps, job);
  try {
    const { runId, status } = await deps.executeInquiryRun.execute(job.runId);
    if (!runId) {
      deps.log({ runId: job.runId }, "inquiry run was not claimable, another worker holds it");
      return;
    }
    deps.log({ runId, status }, "inquiry run finished");
  } finally {
    stopHeartbeat();
  }
}

async function drainStranded(deps: ConsumerDeps): Promise<void> {
  for (let recovered = 0; recovered < deps.reclaimBatchSize; recovered += 1) {
    const { runId, status } = await deps.executeInquiryRun.execute();
    if (!runId) return;
    deps.log({ runId, status }, "recovered a stranded inquiry run");
  }
}

async function reclaimAbandoned(deps: ConsumerDeps): Promise<void> {
  const jobs = await deps.queue.reclaimStale(deps.reclaimIdleMs, deps.reclaimBatchSize);
  for (const job of jobs) {
    deps.log({ runId: job.runId }, "reclaimed an abandoned inquiry job");
    await settle(deps, job);
  }
}

async function settle(deps: ConsumerDeps, job: InquiryJob): Promise<void> {
  try {
    await runJob(deps, job);
  } catch (error) {
    deps.log({ runId: job.runId, err: error }, "inquiry job failed");
    await deps.queue.deadLetter(job, String(error));
    return;
  }
  await deps.queue.acknowledge(job.deliveryId);
}

export function createConsumer(deps: ConsumerDeps): {
  drainOnce: () => Promise<void>;
  recoverOnce: () => Promise<void>;
} {
  return {
    async drainOnce() {
      const jobs = await deps.queue.reserve(1);
      for (const job of jobs) await settle(deps, job);
    },
    async recoverOnce() {
      try {
        await drainStranded(deps);
      } catch (error) {
        deps.log({ err: error }, "inquiry stranded drain failed");
      }
      try {
        await reclaimAbandoned(deps);
      } catch (error) {
        deps.log({ err: error }, "inquiry reclaim pass failed");
      }
    },
  };
}
