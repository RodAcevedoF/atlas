const DEFAULT_SOURCE_TIMEOUT_MS = 15_000;

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
    throw new AggregateError(
      failures.map((failure) => failure.reason),
      `[${label}] every source failed: ${failures.map((failure) => failure.source).join(", ")}`,
    );
  }

  return results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
}
