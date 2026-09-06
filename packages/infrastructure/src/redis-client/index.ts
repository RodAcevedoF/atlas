import { Redis } from "ioredis";
import { type Logger, createLogger } from "../logger/index.ts";

export const DEFAULT_REDIS_URL = "redis://127.0.0.1:6379";
export const DEFAULT_REDIS_COMMAND_TIMEOUT_MS = 10_000;

const RECONNECT_BACKOFF_STEP_MS = 1_000;
const RECONNECT_BACKOFF_CAP_MS = 15_000;

interface WatchedRedisOptions {
  name: string;
  timeoutMs?: number;
  log?: Logger;
}

function reconnectBackoff(attempt: number): number {
  return Math.min(attempt * RECONNECT_BACKOFF_STEP_MS, RECONNECT_BACKOFF_CAP_MS);
}

export function createWatchedRedisClient(url: string, options: WatchedRedisOptions): Redis {
  const { name, timeoutMs = DEFAULT_REDIS_COMMAND_TIMEOUT_MS, log = createLogger() } = options;
  const connection = new Redis(url, {
    commandTimeout: timeoutMs,
    socketTimeout: timeoutMs,
    retryStrategy: reconnectBackoff,
  });
  connection.on("error", (error) =>
    log.error({ connection: name, err: error }, "redis connection error"),
  );
  connection.on("close", () => log.warn({ connection: name }, "redis connection closed"));
  connection.on("reconnecting", (delayMs: number) =>
    log.warn({ connection: name, delayMs }, "redis reconnecting"),
  );
  connection.on("ready", () => log.info({ connection: name }, "redis connection ready"));
  return connection;
}
