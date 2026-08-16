const DEFAULT_SOURCE_TIMEOUT_MS = 15_000;
const DEFAULT_FAILOVER_BUDGET_MS = 20_000;

export class SourceTimeoutError extends Error {
  constructor(source: string, timeoutMs: number) {
    super(`${source} did not answer within ${timeoutMs}ms`);
    this.name = "SourceTimeoutError";
  }
}

export interface FanOutTask<T> {
  source: string;
  run: () => Promise<T>;
}

interface SourceFailure {
  source: string;
  reason: unknown;
}

function withDeadline<T>(source: string, work: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new SourceTimeoutError(source, timeoutMs)), timeoutMs);
  });
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
}

function collectFailures<T>(
  tasks: readonly FanOutTask<T>[],
  results: readonly PromiseSettledResult<T>[],
): SourceFailure[] {
  return tasks.flatMap((task, index) => {
    const result = results[index];
    if (result.status !== "rejected") return [];
    return [{ source: task.source, reason: result.reason }];
  });
}

function everySourceFailed(
  label: string,
  sources: readonly string[],
  reasons: readonly unknown[],
): AggregateError {
  return new AggregateError(reasons, `[${label}] every source failed: ${sources.join(", ")}`);
}

export async function failOverAcrossSources<T>(
  label: string,
  tasks: readonly FanOutTask<T>[],
  timeoutMs: number = DEFAULT_SOURCE_TIMEOUT_MS,
  budgetMs: number = DEFAULT_FAILOVER_BUDGET_MS,
): Promise<T> {
  const reasons: unknown[] = [];
  const startedAt = Date.now();

  for (const task of tasks) {
    const remainingMs = Math.max(0, budgetMs - (Date.now() - startedAt));
    try {
      return await withDeadline(
        task.source,
        Promise.resolve().then(() => task.run()),
        Math.min(timeoutMs, remainingMs),
      );
    } catch (reason) {
      console.warn(`[${label}] ${task.source} failed`, reason);
      reasons.push(reason);
    }
  }

  throw everySourceFailed(
    label,
    tasks.map((task) => task.source),
    reasons,
  );
}

export async function fanOutToSources<T>(
  label: string,
  tasks: readonly FanOutTask<T>[],
  timeoutMs: number = DEFAULT_SOURCE_TIMEOUT_MS,
): Promise<T[]> {
  const results = await Promise.allSettled(
    tasks.map((task) =>
      withDeadline(
        task.source,
        Promise.resolve().then(() => task.run()),
        timeoutMs,
      ),
    ),
  );

  const failures = collectFailures(tasks, results);
  for (const failure of failures) {
    console.warn(`[${label}] ${failure.source} failed`, failure.reason);
  }
  if (failures.length === tasks.length) {
    throw everySourceFailed(
      label,
      failures.map((failure) => failure.source),
      failures.map((failure) => failure.reason),
    );
  }

  return results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
}
