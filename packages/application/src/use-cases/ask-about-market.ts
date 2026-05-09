import type { MarketId } from "@atlas/domain";

export interface AskAboutMarketInput {
  marketId: MarketId;
  question: string;
}

export interface AskAboutMarketOutput {
  answer: string;
  citations: Array<{ label: string; value: string | number; source: string }>;
}

export interface AskAboutMarket {
  execute(input: AskAboutMarketInput): Promise<AskAboutMarketOutput>;
  stream(input: AskAboutMarketInput): AsyncIterable<string>;
}
