import type { MarketId } from "./market.ts";

export interface Watchlist {
  id: string;
  userId: string;
  marketIds: MarketId[];
  createdAt: Date;
  updatedAt: Date;
}
