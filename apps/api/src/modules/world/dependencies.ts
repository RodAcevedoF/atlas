import type { ListWorldSnapshots, SignalStorePort } from "@atlas/application";
import { ListWorldSnapshotsUseCase } from "@atlas/application";

export interface WorldDeps {
  listWorldSnapshots: ListWorldSnapshots;
}

export function makeWorldDependencies(deps: { store: SignalStorePort }): WorldDeps {
  return {
    listWorldSnapshots: new ListWorldSnapshotsUseCase(deps.store),
  };
}
