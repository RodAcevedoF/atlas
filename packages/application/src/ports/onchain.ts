import type { MarketId } from "@atlas/domain";

export interface TopTrader {
  walletAddress: string;
  volumeUsd: number;
  pnlUsd: number | null;
  tradeCount: number;
}

export interface OnChainPort {
  getTopTraders(marketId: MarketId, limit?: number): Promise<TopTrader[]>;
  getWalletActivity(walletAddress: string, marketId?: MarketId): Promise<{ volume: number; positions: number }>;
}
