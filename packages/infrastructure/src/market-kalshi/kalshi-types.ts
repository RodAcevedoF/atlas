export interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  title: string;
  yes_sub_title?: string;
  rules_primary?: string;
  status: string; // "active" | "closed" | "settled" | …
  last_price_dollars?: string;
  yes_bid_dollars?: string;
  yes_ask_dollars?: string;
  volume_fp?: string; // contracts traded
  liquidity_dollars?: string; // USD of resting liquidity
  open_time?: string; // ISO string
  close_time?: string; // ISO string
  updated_time?: string; // ISO string
}

export interface KalshiEvent {
  event_ticker: string;
  series_ticker?: string;
  title: string;
  sub_title?: string;
  category?: string; // e.g. "Politics", "Economics", "Climate and Weather"
  markets?: KalshiMarket[]; // populated when with_nested_markets=true
}

export interface KalshiEventsResponse {
  events: KalshiEvent[];
  cursor?: string;
}

export interface KalshiEventResponse {
  event: KalshiEvent;
}

export interface KalshiMarketResponse {
  market: KalshiMarket;
}
