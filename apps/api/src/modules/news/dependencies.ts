import type { IngestNews, MarketStorePort, SignalSourcePort } from "@atlas/application";
import { IngestNewsUseCase } from "@atlas/application";

export interface NewsDeps {
  ingestNews: IngestNews;
}

export function makeNewsDependencies(deps: {
  signalSource: SignalSourcePort;
  store: MarketStorePort;
}): NewsDeps {
  return {
    ingestNews: new IngestNewsUseCase(deps.signalSource, deps.store),
  };
}
