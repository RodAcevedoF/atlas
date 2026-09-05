import { ExecuteInquiryRunUseCase } from "@atlas/application";
import { RedisInquiryJobQueue, isCommandTimeout } from "@atlas/infra/inquiry-job-queue-redis";
import { HttpOrchestration } from "@atlas/infra/orchestration-http";
import { createRedisClient } from "@atlas/infra/session-redis";
import { MongoInquiryRunStore, createMongoClient } from "@atlas/infra/store-mongodb";
import { readWorkerConfig } from "./config.ts";
import { createConsumer } from "./consumer.ts";
import { runConsumeLoop } from "./loop.ts";

type RedisConnection = ReturnType<typeof createRedisClient>;

const RECONNECT_BACKOFF_STEP_MS = 1_000;
const RECONNECT_BACKOFF_CAP_MS = 15_000;

function log(fields: Record<string, unknown>, message: string): void {
  console.log(JSON.stringify({ ...fields, message, at: new Date().toISOString() }));
}

function reconnectBackoff(attempt: number): number {
  return Math.min(attempt * RECONNECT_BACKOFF_STEP_MS, RECONNECT_BACKOFF_CAP_MS);
}

function createWatchedConnection(url: string, name: string, timeoutMs: number): RedisConnection {
  const connection = createRedisClient(url, {
    commandTimeout: timeoutMs,
    socketTimeout: timeoutMs,
    retryStrategy: reconnectBackoff,
  });
  connection.on("error", (error) =>
    log({ connection: name, err: error }, "redis connection error"),
  );
  connection.on("close", () => log({ connection: name }, "redis connection closed"));
  connection.on("reconnecting", (delayMs: number) =>
    log({ connection: name, delayMs }, "redis reconnecting"),
  );
  connection.on("ready", () => log({ connection: name }, "redis connection ready"));
  return connection;
}

async function closeConnection(connection: RedisConnection, name: string): Promise<void> {
  try {
    await connection.quit();
  } catch (error) {
    log({ connection: name, err: error }, "redis quit failed, forcing disconnect");
    connection.disconnect();
  }
}

async function main(): Promise<void> {
  const config = readWorkerConfig(process.env);

  const mongo = createMongoClient(config.mongoUri);
  await mongo.connect();
  const store = new MongoInquiryRunStore(mongo.db(config.mongoDbName));

  const redis = createWatchedConnection(config.redisUrl, "commands", config.commandTimeoutMs);
  const blockingRedis = createWatchedConnection(
    config.redisUrl,
    "blocking-read",
    config.blockingCommandTimeoutMs,
  );
  const queue = new RedisInquiryJobQueue(redis, blockingRedis, {
    consumerName: config.consumerName,
    blockMs: config.queueBlockMs,
  });
  await queue.ensureGroup();

  const executeInquiryRun = new ExecuteInquiryRunUseCase(
    store,
    new HttpOrchestration(config.intelligenceUrl),
    config.retryAfterMs,
    config.runTimeoutMs,
  );

  const consumer = createConsumer({
    queue,
    executeInquiryRun,
    ownershipRefreshMs: config.ownershipRefreshMs,
    reclaimIdleMs: config.reclaimIdleMs,
    reclaimBatchSize: config.reclaimBatchSize,
    log,
  });

  let running = true;
  let signalStop = (): void => {};
  const stopRequested = new Promise<void>((resolve) => {
    signalStop = resolve;
  });
  const stop = (): void => {
    if (!running) return;
    running = false;
    signalStop();
    log({ consumer: config.consumerName }, "inquiry worker stopping");
  };

  const reconnectOnTimeout = (error: unknown): void => {
    if (!isCommandTimeout(error)) return;
    log({ consumer: config.consumerName }, "redis command timed out, forcing reconnect");
    redis.disconnect(true);
    blockingRedis.disconnect(true);
  };

  const recovery = setInterval(() => {
    void consumer.recoverOnce();
  }, config.reconcileIntervalMs);

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  log({ consumer: config.consumerName }, "inquiry worker ready");
  await consumer.recoverOnce();

  await runConsumeLoop({
    drainOnce: async () => {
      try {
        await consumer.drainOnce();
      } catch (error) {
        reconnectOnTimeout(error);
        throw error;
      }
    },
    isRunning: () => running,
    stopRequested,
    shutdownGraceMs: config.queueBlockMs,
    errorBackoffMs: config.queueBlockMs,
    log,
  });

  clearInterval(recovery);
  await Promise.all([
    closeConnection(redis, "commands"),
    closeConnection(blockingRedis, "blocking-read"),
  ]);
  await mongo.close();
  log({ consumer: config.consumerName }, "inquiry worker stopped");
}

await main();
