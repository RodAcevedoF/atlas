import type { MarketStorePort, OrchestrationPort } from "@atlas/application";
import {
  ListWorldEventsUseCase,
  ListWorldScanReportsUseCase,
  ListWorldTopicsUseCase,
  WorldScanUseCase,
} from "@atlas/application";
import type { IWorldService } from "./service.ts";
import { WorldService } from "./world-service.ts";

export function makeWorldDependencies(deps: {
  store: MarketStorePort;
  orchestration: OrchestrationPort;
}): { service: IWorldService } {
  return {
    service: new WorldService(
      new ListWorldTopicsUseCase(deps.store),
      new ListWorldEventsUseCase(deps.store),
      new WorldScanUseCase(deps.store, deps.orchestration),
      new ListWorldScanReportsUseCase(deps.store),
    ),
  };
}
