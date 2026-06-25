import type { MarketStorePort } from "../ports/market-store.ts";
import type {
  ListWorldTopics,
  ListWorldTopicsInput,
  ListWorldTopicsOutput,
} from "./list-world-topics.ts";

export class ListWorldTopicsUseCase implements ListWorldTopics {
  constructor(private readonly store: MarketStorePort) {}

  execute(input: ListWorldTopicsInput = {}): Promise<ListWorldTopicsOutput> {
    return this.store.listRegionTopicBreakdowns(input);
  }
}
