import type { MarketStorePort } from "@atlas/application";
import { ListWorldEventsUseCase, ListWorldTopicsUseCase } from "@atlas/application";
import type { IWorldService } from "./service.ts";
import { WorldService } from "./world-service.ts";

export function makeWorldDependencies(deps: {
  store: MarketStorePort;
}): { service: IWorldService } {
  return {
    service: new WorldService(
      new ListWorldTopicsUseCase(deps.store),
      new ListWorldEventsUseCase(deps.store),
    ),
  };
}
