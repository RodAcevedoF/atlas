import type {
  ExecuteInquiryRun,
  InquiryJob,
  InquiryJobQueuePort,
  ReconcileInquiryNotifications,
} from "@atlas/application";
import type { Logger } from "@atlas/infra/logger";

export interface ConsumerDeps {
  queue: InquiryJobQueuePort;
  executeInquiryRun: ExecuteInquiryRun;
  reconcileNotifications: ReconcileInquiryNotifications;
  ownershipRefreshMs: number;
  reclaimIdleMs: number;
  reclaimBatchSize: number;
  log: Logger;
}

function heartbeat(deps: ConsumerDeps, job: InquiryJob): () => void {
  const timer = setInterval(() => {
    deps.queue.refreshOwnership(job.deliveryId).catch((error: unknown) => {
      deps.log.warn({ runId: job.runId, err: error }, "inquiry ownership refresh failed");
    });
  }, deps.ownershipRefreshMs);

  return () => clearInterval(timer);
}

async function runJob(deps: ConsumerDeps, job: InquiryJob): Promise<void> {
  const stopHeartbeat = heartbeat(deps, job);
  try {
    const { runId, status } = await deps.executeInquiryRun.execute(job.runId);
    if (!runId) {
      deps.log.info({ runId: job.runId }, "inquiry run was already claimed");
      return;
    }
    deps.log.info({ runId, status }, "inquiry run finished");
  } finally {
    stopHeartbeat();
  }
}

async function drainStranded(deps: ConsumerDeps): Promise<void> {
  for (let recovered = 0; recovered < deps.reclaimBatchSize; recovered += 1) {
    const { runId, status } = await deps.executeInquiryRun.execute();
    if (!runId) return;
    deps.log.info({ runId, status }, "recovered a stranded inquiry run");
  }
}

async function reclaimAbandoned(deps: ConsumerDeps): Promise<void> {
  const jobs = await deps.queue.reclaimStale(deps.reclaimIdleMs, deps.reclaimBatchSize);
  for (const job of jobs) {
    deps.log.warn({ runId: job.runId }, "reclaimed an abandoned inquiry job");
    await settle(deps, job);
  }
}

async function republishStrandedNotifications(deps: ConsumerDeps): Promise<void> {
  const { stranded, republished } = await deps.reconcileNotifications.reconcile();
  if (stranded === 0) return;
  if (republished < stranded) {
    deps.log.error(
      { stranded, republished },
      "inquiry notifications are still stranded after a reconcile pass",
    );
    return;
  }
  deps.log.warn({ republished }, "republished stranded inquiry notifications");
}

async function guarded(
  deps: ConsumerDeps,
  message: string,
  pass: () => Promise<void>,
): Promise<void> {
  try {
    await pass();
  } catch (error) {
    deps.log.error({ err: error }, message);
  }
}

async function settle(deps: ConsumerDeps, job: InquiryJob): Promise<void> {
  try {
    await runJob(deps, job);
  } catch (error) {
    deps.log.error({ runId: job.runId, err: error }, "inquiry job failed");
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
      await guarded(deps, "inquiry stranded drain failed", () => drainStranded(deps));
      await guarded(deps, "inquiry reclaim pass failed", () => reclaimAbandoned(deps));
      await guarded(deps, "inquiry notification reconcile failed", () =>
        republishStrandedNotifications(deps),
      );
    },
  };
}
