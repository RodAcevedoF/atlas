import type {
  ListWorldEvents,
  ListWorldScanReports,
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
  ListWorldTopicsUseCase,
  WorldScanUseCase,
} from "@atlas/application";

export interface WorldDeps {
  listWorldTopics: ListWorldTopics;
  listWorldEvents: ListWorldEvents;
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
    runWorldScan: new WorldScanUseCase(deps.store, deps.orchestration),
    listWorldScanReports: new ListWorldScanReportsUseCase(deps.store),
  };
}
