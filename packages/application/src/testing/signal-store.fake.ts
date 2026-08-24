import type { Signal } from "@atlas/domain";
import type {
  SignalClassificationUpdate,
  SignalStorePort,
} from "../world/outbound/signal-store.ts";

export type ListSignalsFilter = Parameters<SignalStorePort["listSignals"]>[0];

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
    updateSignalClassifications(updates: SignalClassificationUpdate[]) {
      for (const update of updates) {
        const signal = held.get(update.id);
        if (!signal) continue;
        held.set(update.id, { ...signal, topic: update.topic, sentiment: update.sentiment });
      }
      return Promise.resolve();
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
