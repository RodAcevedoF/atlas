import type {
  ExecuteInquiryRun,
  ExecuteInquiryRunOutput,
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

async function recordPermanentFailure(
  deps: ConsumerDeps,
  result: ExecuteInquiryRunOutput,
): Promise<void> {
  if (!result.runId || result.status !== "failed_permanent") return;
  try {
    await deps.queue.recordFailure(result.runId, result.status);
  } catch (error) {
    deps.log.error(
      { runId: result.runId, err: error },
      "permanent inquiry failure could not be recorded in Redis; Mongo retains the outcome",
    );
  }
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
    const result = await deps.executeInquiryRun.execute(job.runId);
    const { runId, status } = result;
    if (!runId) {
      deps.log.info({ runId: job.runId }, "inquiry run was already claimed");
      return;
    }
    await recordPermanentFailure(deps, result);
    deps.log.info({ runId, status }, "inquiry run finished");
  } finally {
    stopHeartbeat();
  }
}

async function drainStranded(deps: ConsumerDeps): Promise<void> {
  for (let recovered = 0; recovered < deps.reclaimBatchSize; recovered += 1) {
    const result = await deps.executeInquiryRun.execute();
    const { runId, status } = result;
    if (!runId) return;
    await recordPermanentFailure(deps, result);
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
  let available = Promise.resolve();
  let recovery: Promise<void> | null = null;
  let notifications: Promise<void> | null = null;

  async function exclusively(pass: () => Promise<void>): Promise<void> {
    const previous = available;
    let release = (): void => {};
    available = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      await pass();
    } finally {
      release();
    }
  }

  return {
    async drainOnce() {
      await exclusively(async () => {
        const jobs = await deps.queue.reserve(1);
        for (const job of jobs) await settle(deps, job);
      });
    },
    async recoverOnce() {
      if (!notifications) {
        notifications = guarded(deps, "inquiry notification reconcile failed", () =>
          republishStrandedNotifications(deps),
        ).finally(() => {
          notifications = null;
        });
      }
      if (!recovery) {
        recovery = exclusively(async () => {
          await guarded(deps, "inquiry stranded drain failed", () => drainStranded(deps));
          await guarded(deps, "inquiry reclaim pass failed", () => reclaimAbandoned(deps));
        }).finally(() => {
          recovery = null;
        });
      }
      await Promise.all([recovery, notifications]);
    },
  };
}
