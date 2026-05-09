import type { EventId, Insight, MarketId } from "@atlas/domain";

export interface RunMarketIntelligenceInput {
  marketId?: MarketId;
  eventId?: EventId;
  force?: boolean;
}

export interface RunMarketIntelligenceOutput {
  runId: string;
  insight: Insight;
}

export interface RunMarketIntelligence {
  execute(input: RunMarketIntelligenceInput): Promise<RunMarketIntelligenceOutput>;
  stream(input: RunMarketIntelligenceInput): AsyncIterable<string>;
}
