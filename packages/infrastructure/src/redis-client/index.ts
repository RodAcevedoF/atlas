import { Redis } from "ioredis";

export const DEFAULT_REDIS_URL = "redis://127.0.0.1:6379";
export const DEFAULT_REDIS_COMMAND_TIMEOUT_MS = 10_000;

const RECONNECT_BACKOFF_STEP_MS = 1_000;
const RECONNECT_BACKOFF_CAP_MS = 15_000;

export type RedisConnectionLog = (fields: Record<string, unknown>, message: string) => void;

interface WatchedRedisOptions {
  name: string;
  timeoutMs?: number;
  log?: RedisConnectionLog;
}

function reconnectBackoff(attempt: number): number {
  return Math.min(attempt * RECONNECT_BACKOFF_STEP_MS, RECONNECT_BACKOFF_CAP_MS);
}

function logJsonLine(fields: Record<string, unknown>, message: string): void {
  console.log(JSON.stringify({ ...fields, message, at: new Date().toISOString() }));
}

export function createWatchedRedisClient(url: string, options: WatchedRedisOptions): Redis {
  const { name, timeoutMs = DEFAULT_REDIS_COMMAND_TIMEOUT_MS, log = logJsonLine } = options;
  const connection = new Redis(url, {
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
