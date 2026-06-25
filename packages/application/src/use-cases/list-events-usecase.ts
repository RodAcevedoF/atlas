import type { MarketStorePort } from "../ports/market-store.ts";
import type { ListEvents, ListEventsInput, ListEventsOutput } from "./list-events.ts";

export class ListEventsUseCase implements ListEvents {
  constructor(private readonly store: MarketStorePort) {}

  execute(input: ListEventsInput = {}): Promise<ListEventsOutput> {
    return this.store.listEvents(input);
  }
}
