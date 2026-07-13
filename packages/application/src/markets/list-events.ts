import type { PredictionEvent } from "@atlas/domain";
import type { MarketStorePort } from "../ports/market-store.ts";

export interface ListEventsInput {
  limit?: number;
}

export type ListEventsOutput = PredictionEvent[];

export interface ListEvents {
  execute(input?: ListEventsInput): Promise<ListEventsOutput>;
}

export class ListEventsUseCase implements ListEvents {
  constructor(private readonly store: MarketStorePort) {}

  execute(input: ListEventsInput = {}): Promise<ListEventsOutput> {
    return this.store.listEvents(input);
  }
}
