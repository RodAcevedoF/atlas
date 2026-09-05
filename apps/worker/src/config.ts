import { DEFAULT_REDIS_COMMAND_TIMEOUT_MS, DEFAULT_REDIS_URL } from "@atlas/infra/redis-client";
import { RUN_EXECUTION_DEFAULTS, readPositiveNumber } from "@atlas/shared";

export interface WorkerConfig {
  mongoUri: string;
  mongoDbName: string;
  redisUrl: string;
  intelligenceUrl: string;
  retryAfterMs: number;
  runTimeoutMs: number;
  queueBlockMs: number;
  commandTimeoutMs: number;
  blockingCommandTimeoutMs: number;
  ownershipRefreshMs: number;
  reclaimIdleMs: number;
  reconcileIntervalMs: number;
  reclaimBatchSize: number;
  consumerName: string;
}

const DEFAULTS = {
  queueBlockMs: 5_000,
  ownershipRefreshMs: 30_000,
  reconcileIntervalMs: 30_000,
  reclaimBatchSize: 10,
} as const;

export const RECLAIM_IDLE_MULTIPLE = 5;

export function readWorkerConfig(env: Record<string, string | undefined>): WorkerConfig {
  const mongoUri = env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI is required");

  const queueBlockMs = readPositiveNumber(env, "INQUIRY_QUEUE_BLOCK_MS", DEFAULTS.queueBlockMs);
  const ownershipRefreshMs = readPositiveNumber(
    env,
    "INQUIRY_OWNERSHIP_REFRESH_MS",
    DEFAULTS.ownershipRefreshMs,
  );

  return {
    mongoUri,
    mongoDbName: env.MONGODB_DB_NAME ?? RUN_EXECUTION_DEFAULTS.mongoDbName,
    redisUrl: env.REDIS_URL ?? DEFAULT_REDIS_URL,
    intelligenceUrl: env.INTELLIGENCE_URL ?? "http://127.0.0.1:8888",
    retryAfterMs: readPositiveNumber(
      env,
      "INQUIRY_RETRY_AFTER_MS",
      RUN_EXECUTION_DEFAULTS.retryAfterMs,
    ),
    runTimeoutMs: readPositiveNumber(
      env,
      "INQUIRY_RUN_TIMEOUT_MS",
      RUN_EXECUTION_DEFAULTS.runTimeoutMs,
    ),
    queueBlockMs,
    commandTimeoutMs: DEFAULT_REDIS_COMMAND_TIMEOUT_MS,
    blockingCommandTimeoutMs: queueBlockMs + DEFAULT_REDIS_COMMAND_TIMEOUT_MS,
    ownershipRefreshMs,
    reclaimIdleMs: ownershipRefreshMs * RECLAIM_IDLE_MULTIPLE,
    reconcileIntervalMs: readPositiveNumber(
      env,
      "INQUIRY_RECONCILE_INTERVAL_MS",
      DEFAULTS.reconcileIntervalMs,
    ),
    reclaimBatchSize: DEFAULTS.reclaimBatchSize,
    consumerName: env.INQUIRY_WORKER_NAME ?? `worker-${process.pid}`,
  };
}
