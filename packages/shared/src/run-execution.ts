export const RUN_EXECUTION_DEFAULTS = {
  retryAfterMs: 11 * 60 * 1000,
  runTimeoutMs: 120_000,
  mongoDbName: "atlas",
} as const;

export function readPositiveNumber(
  env: Record<string, string | undefined>,
  name: string,
  fallback: number,
): number {
  const raw = env[name];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${name} must be a positive number`);
  return parsed;
}
