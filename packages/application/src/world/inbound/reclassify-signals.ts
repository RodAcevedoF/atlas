import type { Signal, Topic } from "@atlas/domain";
import {
  classifySentimentFromText,
  deriveRegionsFromText,
  deriveTopicFromText,
} from "@atlas/domain";
import type { SignalClassificationUpdate, SignalStorePort } from "../outbound/signal-store.ts";

export interface RegionDiagnostics {
  divergent: number;
  wouldNarrowToGlobal: number;
}

export interface ReclassifySignalsInput {
  dryRun?: boolean;
}

export interface ReclassifySignalsOutput {
  scanned: number;
  changed: number;
  otherShareBefore: number;
  otherShareAfter: number;
  regions: RegionDiagnostics;
}

export interface ReclassifySignals {
  execute(input?: ReclassifySignalsInput): Promise<ReclassifySignalsOutput>;
}

function reclassify(signal: Signal): SignalClassificationUpdate {
  return {
    id: signal.id,
    topic: deriveTopicFromText([signal.title]),
    sentiment: classifySentimentFromText([signal.title]),
  };
}

function isChanged(signal: Signal, update: SignalClassificationUpdate): boolean {
  return signal.topic !== update.topic || signal.sentiment !== update.sentiment;
}

function otherShare(topics: Topic[]): number {
  if (topics.length === 0) return 0;
  return topics.filter((topic) => topic === "other").length / topics.length;
}

function diagnoseRegions(signals: Signal[]): RegionDiagnostics {
  let divergent = 0;
  let wouldNarrowToGlobal = 0;

  for (const signal of signals) {
    const recomputed = deriveRegionsFromText([signal.title]);
    const stored = new Set(signal.regions);
    const differs =
      recomputed.length !== stored.size || recomputed.some((region) => !stored.has(region));
    if (!differs) continue;

    divergent += 1;
    const isGlobalOnly = recomputed.length === 1 && recomputed[0] === "global";
    if (isGlobalOnly) wouldNarrowToGlobal += 1;
  }

  return { divergent, wouldNarrowToGlobal };
}

export class ReclassifySignalsUseCase implements ReclassifySignals {
  constructor(private readonly store: SignalStorePort) {}

  async execute(input: ReclassifySignalsInput = {}): Promise<ReclassifySignalsOutput> {
    const signals = await this.store.listSignals({ source: "news" });
    const reclassified = signals.map((signal) => ({ signal, update: reclassify(signal) }));
    const changed = reclassified
      .filter(({ signal, update }) => isChanged(signal, update))
      .map(({ update }) => update);

    const report: ReclassifySignalsOutput = {
      scanned: signals.length,
      changed: changed.length,
      otherShareBefore: otherShare(signals.map((signal) => signal.topic)),
      otherShareAfter: otherShare(reclassified.map(({ update }) => update.topic)),
      regions: diagnoseRegions(signals),
    };

    if (!input.dryRun) await this.store.updateSignalClassifications(changed);

    return report;
  }
}
