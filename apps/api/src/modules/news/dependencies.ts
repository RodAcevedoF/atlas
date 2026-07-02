import type { MarketStorePort, SignalSourcePort } from "@atlas/application";
import { IngestNewsUseCase } from "@atlas/application";
import { NewsService } from "./news-service.ts";
import type { INewsService } from "./service.ts";

export function makeNewsDependencies(deps: {
  signalSource: SignalSourcePort;
  store: MarketStorePort;
}): { service: INewsService } {
  return {
    service: new NewsService(new IngestNewsUseCase(deps.signalSource, deps.store)),
  };
}
