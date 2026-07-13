import type { IngestNews, SignalSourcePort, SignalStorePort } from "@atlas/application";
import { IngestNewsUseCase } from "@atlas/application";

export interface NewsDeps {
  ingestNews: IngestNews;
}

export function makeNewsDependencies(deps: {
  signalSource: SignalSourcePort;
  store: SignalStorePort;
}): NewsDeps {
  return {
    ingestNews: new IngestNewsUseCase(deps.signalSource, deps.store),
  };
}
