import { ExecuteInquiryRunUseCase } from "@atlas/application";
import { RedisInquiryJobQueue, isCommandTimeout } from "@atlas/infra/inquiry-job-queue-redis";
import { createLogger } from "@atlas/infra/logger";
import { HttpOrchestration } from "@atlas/infra/orchestration-http";
import { createWatchedRedisClient } from "@atlas/infra/redis-client";
import { MongoInquiryRunStore, createMongoClient } from "@atlas/infra/store-mongodb";
import { readWorkerConfig } from "./config.ts";
import { createConsumer } from "./consumer.ts";
import { runConsumeLoop } from "./loop.ts";

type RedisConnection = ReturnType<typeof createWatchedRedisClient>;

const logger = createLogger();

async function closeConnection(connection: RedisConnection, name: string): Promise<void> {
  try {
    await connection.quit();
  } catch (error) {
    logger.warn({ connection: name, err: error }, "redis quit failed, forcing disconnect");
    connection.disconnect();
  }
}

async function main(): Promise<void> {
  const config = readWorkerConfig(process.env);

  const mongo = createMongoClient(config.mongoUri);
  await mongo.connect();
  const store = new MongoInquiryRunStore(mongo.db(config.mongoDbName));

  const redis = createWatchedRedisClient(config.redisUrl, {
    name: "commands",
    timeoutMs: config.commandTimeoutMs,
    log: logger,
  });
  const blockingRedis = createWatchedRedisClient(config.redisUrl, {
    name: "blocking-read",
    timeoutMs: config.blockingCommandTimeoutMs,
    log: logger,
  });
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
    log: logger,
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
    logger.info({ consumer: config.consumerName }, "inquiry worker stopping");
  };

  const reconnectOnTimeout = (error: unknown): void => {
    if (!isCommandTimeout(error)) return;
    logger.warn({ consumer: config.consumerName }, "redis command timed out, forcing reconnect");
    redis.disconnect(true);
    blockingRedis.disconnect(true);
  };

  const recovery = setInterval(() => {
    void consumer.recoverOnce();
  }, config.reconcileIntervalMs);

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  logger.info({ consumer: config.consumerName }, "inquiry worker ready");
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
    log: logger,
  });

  clearInterval(recovery);
  await Promise.all([
    closeConnection(redis, "commands"),
    closeConnection(blockingRedis, "blocking-read"),
  ]);
  await mongo.close();
  logger.info({ consumer: config.consumerName }, "inquiry worker stopped");
}

await main();
