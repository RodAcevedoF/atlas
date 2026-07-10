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

export interface MarketMover {
  marketId: MarketId;
  volumeUsd: number;
  volumeDeltaUsd: number;
  outcomes: { outcomeId: OutcomeId; price: number; priceDelta: number }[];
  from: Date;
  to: Date;
}

export function topMarketMovers(snapshots: MarketSnapshot[], limit: number): MarketMover[] {
  const byMarket = new Map<string, MarketSnapshot[]>();
  for (const snapshot of snapshots) {
    const key = snapshot.marketId as string;
    const bucket = byMarket.get(key);
    if (bucket) bucket.push(snapshot);
    else byMarket.set(key, [snapshot]);
  }

  const movers: MarketMover[] = [];
  for (const bucket of byMarket.values()) {
    const ordered = [...bucket].sort(
      (left, right) => left.timestamp.getTime() - right.timestamp.getTime(),
    );
    const earliest = ordered[0];
    const latest = ordered[ordered.length - 1];
    if (!earliest || !latest) continue;

    const earliestPrice = new Map(earliest.outcomes.map((o) => [o.outcomeId as string, o.price]));
    movers.push({
      marketId: latest.marketId,
      volumeUsd: latest.volumeUsd,
      volumeDeltaUsd: latest.volumeUsd - earliest.volumeUsd,
      outcomes: latest.outcomes.map((outcome) => ({
        outcomeId: outcome.outcomeId,
        price: outcome.price,
        priceDelta:
          outcome.price - (earliestPrice.get(outcome.outcomeId as string) ?? outcome.price),
      })),
      from: earliest.timestamp,
      to: latest.timestamp,
    });
  }

  return movers
    .sort((left, right) => Math.abs(right.volumeDeltaUsd) - Math.abs(left.volumeDeltaUsd))
    .slice(0, limit);
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
