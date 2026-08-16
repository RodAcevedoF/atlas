import type { SignalSourceFilter, SignalSourcePort } from "@atlas/application";
import type { Signal } from "@atlas/domain";
import { capToLimit, failOverAcrossSources } from "@atlas/shared";

const TRACKING_PARAM_PREFIX = "utm_";
const TRACKING_PARAMS = new Set(["fbclid", "gclid", "mc_cid", "mc_eid", "igshid"]);

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
    private readonly timeoutMs?: number,
  ) {}

  async fetchSignals(filter?: SignalSourceFilter): Promise<Signal[]> {
    const answered = await failOverAcrossSources(
      "news-composite",
      this.adapters.map((adapter) => ({
        source: adapter.constructor.name,
        run: () => adapter.fetchSignals(filter),
      })),
      this.timeoutMs,
    );

    return capToLimit(dedupeByRef(answered), filter?.limit);
  }
}
