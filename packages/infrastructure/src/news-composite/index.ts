import type { SignalSourceFilter, SignalSourcePort } from "@atlas/application";
import type { Signal } from "@atlas/domain";

const DEFAULT_SOURCE_TIMEOUT_MS = 15_000;

const TRACKING_PARAM_PREFIX = "utm_";
const TRACKING_PARAMS = new Set(["fbclid", "gclid", "mc_cid", "mc_eid", "igshid"]);

interface SourceFailure {
  source: string;
  reason: unknown;
}

export class SourceTimeoutError extends Error {
  constructor(source: string, timeoutMs: number) {
    super(`${source} did not answer within ${timeoutMs}ms`);
    this.name = "SourceTimeoutError";
  }
}

function withDeadline(
  source: string,
  signals: Promise<Signal[]>,
  timeoutMs: number,
): Promise<Signal[]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new SourceTimeoutError(source, timeoutMs)), timeoutMs);
  });
  return Promise.race([signals, deadline]).finally(() => clearTimeout(timer));
}

function perSourceFilter(
  filter: SignalSourceFilter | undefined,
  sourceCount: number,
): SignalSourceFilter | undefined {
  if (!filter?.limit) return filter;
  return { ...filter, limit: Math.ceil(filter.limit / sourceCount) };
}

function isTrackingParam(key: string): boolean {
  const lowered = key.toLowerCase();
  return lowered.startsWith(TRACKING_PARAM_PREFIX) || TRACKING_PARAMS.has(lowered);
}

function canonicalQuery(searchParams: URLSearchParams): string {
  const kept = [...searchParams.entries()]
    .filter(([key]) => !isTrackingParam(key))
    .sort(([left], [right]) => left.localeCompare(right));
  return new URLSearchParams(kept).toString();
}

function canonicalPath(pathname: string): string {
  return pathname.replace(/\/amp\/?$/i, "").replace(/\/+$/, "");
}

function normalizeRef(ref: string): string {
  if (!URL.canParse(ref)) return ref;

  const url = new URL(ref);
  const host = url.host.toLowerCase().replace(/^www\./, "");
  const query = canonicalQuery(url.searchParams);
  const path = canonicalPath(url.pathname);
  return query ? `${host}${path}?${query}` : `${host}${path}`;
}

function collectFailures(
  adapters: readonly SignalSourcePort[],
  results: readonly PromiseSettledResult<Signal[]>[],
): SourceFailure[] {
  return adapters.flatMap((adapter, index) => {
    const result = results[index];
    if (result.status !== "rejected") return [];
    return [{ source: adapter.constructor.name, reason: result.reason }];
  });
}

function dedupeByRef(signals: Signal[]): Signal[] {
  const byRef = new Map<string, Signal>();
  for (const signal of signals) {
    const key = normalizeRef(signal.ref);
    if (!byRef.has(key)) byRef.set(key, signal);
  }
  return [...byRef.values()];
}

export class CompositeSignalSourceAdapter implements SignalSourcePort {
  constructor(
    private readonly adapters: readonly SignalSourcePort[],
    private readonly timeoutMs: number = DEFAULT_SOURCE_TIMEOUT_MS,
  ) {}

  async fetchSignals(filter?: SignalSourceFilter): Promise<Signal[]> {
    const sourceFilter = perSourceFilter(filter, this.adapters.length);
    const results = await Promise.allSettled(
      this.adapters.map((adapter) =>
        withDeadline(adapter.constructor.name, adapter.fetchSignals(sourceFilter), this.timeoutMs),
      ),
    );

    const failures = collectFailures(this.adapters, results);
    for (const failure of failures) {
      console.warn(`[news-composite] ${failure.source} failed`, failure.reason);
    }
    if (failures.length === this.adapters.length) {
      throw new AggregateError(
        failures.map((failure) => failure.reason),
        `every news source failed: ${failures.map((failure) => failure.source).join(", ")}`,
      );
    }

    return dedupeByRef(
      results.flatMap((result) => (result.status === "fulfilled" ? result.value : [])),
    );
  }
}
