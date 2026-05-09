import type { MarketId, Watchlist } from "@atlas/domain";

export interface ManageWatchlistInput {
  userId: string;
  action: "add" | "remove";
  marketId: MarketId;
}

export interface ManageWatchlistOutput {
  watchlist: Watchlist;
}

export interface ManageWatchlist {
  execute(input: ManageWatchlistInput): Promise<ManageWatchlistOutput>;
  getWatchlist(userId: string): Promise<Watchlist | null>;
}
