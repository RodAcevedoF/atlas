import type {
  ListWorldEvents,
  ListWorldSnapshots,
  ListWorldTopics,
  SignalStorePort,
} from "@atlas/application";
import {
  ListWorldEventsUseCase,
  ListWorldSnapshotsUseCase,
  ListWorldTopicsUseCase,
} from "@atlas/application";

export interface WorldDeps {
  listWorldTopics: ListWorldTopics;
  listWorldEvents: ListWorldEvents;
  listWorldSnapshots: ListWorldSnapshots;
}

export function makeWorldDependencies(deps: { store: SignalStorePort }): WorldDeps {
  return {
    listWorldTopics: new ListWorldTopicsUseCase(deps.store),
    listWorldEvents: new ListWorldEventsUseCase(deps.store),
    listWorldSnapshots: new ListWorldSnapshotsUseCase(deps.store),
  };
}
