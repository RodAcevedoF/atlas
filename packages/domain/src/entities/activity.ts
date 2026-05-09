import type { MarketId, OutcomeId } from "./market.ts";

export interface PriceTick {
  marketId: MarketId;
  outcomeId: OutcomeId;
  price: number;
  timestamp: Date;
}

export type TradeSide = "buy" | "sell";

export interface Trade {
  id: string;
  marketId: MarketId;
  outcomeId: OutcomeId;
  side: TradeSide;
  size: number;
  price: number;
  walletAddress: string;
  timestamp: Date;
}
