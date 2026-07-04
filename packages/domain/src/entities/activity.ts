import type { Market, MarketId, OutcomeId } from "./market.ts";

export interface PriceTick {
  marketId: MarketId;
  outcomeId: OutcomeId;
  price: number;
  timestamp: Date;
}


export interface MarketSnapshot {
  marketId: MarketId;
  volumeUsd: number;
  liquidityUsd: number;
  outcomes: { outcomeId: OutcomeId; price: number }[];
  timestamp: Date;
}

export function marketToSnapshot(market: Market, timestamp: Date): MarketSnapshot {
  return {
    marketId: market.id,
    volumeUsd: market.volumeUsd,
    liquidityUsd: market.liquidityUsd,
    outcomes: market.outcomes.map((outcome) => ({ outcomeId: outcome.id, price: outcome.price })),
    timestamp,
  };
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
