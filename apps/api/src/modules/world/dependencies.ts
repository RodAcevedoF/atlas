import type {
  ListWorldEvents,
  ListWorldScanReports,
  ListWorldSnapshots,
  ListWorldTopics,
  MarketStorePort,
  OrchestrationPort,
  SignalStorePort,
  WorldScan,
  WorldScanReportStorePort,
} from "@atlas/application";
import {
  ListWorldEventsUseCase,
  ListWorldScanReportsUseCase,
  ListWorldSnapshotsUseCase,
  ListWorldTopicsUseCase,
  WorldScanUseCase,
} from "@atlas/application";

export interface WorldDeps {
  listWorldTopics: ListWorldTopics;
  listWorldEvents: ListWorldEvents;
  listWorldSnapshots: ListWorldSnapshots;
  runWorldScan: WorldScan;
  listWorldScanReports: ListWorldScanReports;
}

export function makeWorldDependencies(deps: {
  store: MarketStorePort & SignalStorePort & WorldScanReportStorePort;
  orchestration: OrchestrationPort;
}): WorldDeps {
  return {
    listWorldTopics: new ListWorldTopicsUseCase(deps.store),
    listWorldEvents: new ListWorldEventsUseCase(deps.store),
    listWorldSnapshots: new ListWorldSnapshotsUseCase(deps.store),
    runWorldScan: new WorldScanUseCase(deps.store, deps.orchestration),
    listWorldScanReports: new ListWorldScanReportsUseCase(deps.store),
  };
}
