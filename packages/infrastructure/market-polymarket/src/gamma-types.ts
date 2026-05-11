export interface GammaMarketEmbeddedEvent {
  id: string;
  category?: string;
  tags?: Array<{ id: string; label: string; slug: string }>;
}

// Only the fields consumed by the adapter — Gamma returns many more
export interface GammaMarket {
  conditionId: string;
  question: string;
  description: string;
  slug: string;
  active: boolean;
  closed: boolean;
  outcomes: string; // JSON-encoded string[] e.g. '["Yes","No"]'
  outcomePrices: string; // JSON-encoded string[] e.g. '["0.575","0.425"]'
  clobTokenIds: string; // JSON-encoded string[] of on-chain ERC-1155 token IDs
  volumeNum: number;
  liquidityNum: number;
  endDate: string; // ISO string or "" for open-ended markets
  createdAt: string;
  updatedAt: string;
  events: GammaMarketEmbeddedEvent[];
}

export interface GammaEventMarketRef {
  conditionId: string;
  id: string;
}

export interface GammaEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string; // e.g. "Sports", "Crypto" — capitalized
  tags: Array<{ id: string; label: string; slug: string }>;
  markets: GammaEventMarketRef[];
  createdAt: string;
  active: boolean;
  closed: boolean;
}
