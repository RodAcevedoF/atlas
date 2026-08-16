import type { Signal } from "@atlas/domain";
import type {
  SignalClassificationUpdate,
  SignalStorePort,
} from "../world/outbound/signal-store.ts";
import { UnsupportedPortMethodError } from "./unsupported-port-method.ts";

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
    updateSignalClassifications: () => {
      throw new UnsupportedPortMethodError("recordingSignalStore", "updateSignalClassifications");
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

export interface InMemorySignalStore {
  store: SignalStorePort;
  signals(): Signal[];
}

function matchesFilter(signal: Signal, filter: ListSignalsFilter): boolean {
  if (filter?.source && signal.source !== filter.source) return false;
  if (filter?.topic && signal.topic !== filter.topic) return false;
  if (filter?.region && !signal.regions.includes(filter.region)) return false;
  if (filter?.since && signal.timestamp < filter.since) return false;
  return true;
}

export function inMemorySignalStore(seed: Signal[] = []): InMemorySignalStore {
  const held = new Map(seed.map((signal) => [signal.id, signal]));

  const store: SignalStorePort = {
    upsertSignals(signals) {
      for (const signal of signals) held.set(signal.id, signal);
      return Promise.resolve();
    },
    updateSignalClassifications(updates: SignalClassificationUpdate[]) {
      for (const update of updates) {
        const signal = held.get(update.id);
        if (!signal) continue;
        held.set(update.id, { ...signal, topic: update.topic, sentiment: update.sentiment });
      }
      return Promise.resolve();
    },
    listRegionTopicBreakdowns: () => {
      throw new UnsupportedPortMethodError("inMemorySignalStore", "listRegionTopicBreakdowns");
    },
    listTopicSentimentSummaries: () => {
      throw new UnsupportedPortMethodError("inMemorySignalStore", "listTopicSentimentSummaries");
    },
    listSignals(filter) {
      const matches = [...held.values()]
        .filter((signal) => matchesFilter(signal, filter))
        .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime());
      return Promise.resolve(filter?.limit ? matches.slice(0, filter.limit) : matches);
    },
  };

  return { store, signals: () => [...held.values()] };
}
