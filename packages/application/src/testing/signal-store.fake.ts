import type { Signal } from "@atlas/domain";
import type { SignalStorePort } from "../world/outbound/signal-store.ts";

export type ListSignalsFilter = Parameters<SignalStorePort["listSignals"]>[0];

export interface RecordingSignalStore {
  store: SignalStorePort;
  upserted: Signal[][];
  listFilters: ListSignalsFilter[];
}

export function recordingSignalStore(
  candidates: Signal[] = [],
  overrides: Partial<SignalStorePort> = {},
): RecordingSignalStore {
  const upserted: Signal[][] = [];
  const listFilters: ListSignalsFilter[] = [];
  const store: SignalStorePort = {
    upsertSignals(signals) {
      upserted.push(signals);
      return Promise.resolve();
    },
    listRegionTopicBreakdowns: () => Promise.resolve([]),
    listTopicSentimentSummaries: () => Promise.resolve([]),
    listSignals(filter) {
      listFilters.push(filter);
      return Promise.resolve(candidates);
    },
    ...overrides,
  };
  return { store, upserted, listFilters };
}
