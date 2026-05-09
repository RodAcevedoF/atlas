# Data Model

Domain entities are defined in `packages/domain/src/entities/`. This document describes their shape and the planned Postgres persistence layout. SQL schema (Drizzle) lands in M1.

## Domain entities

### `Market`

A single prediction market. Belongs to a `PredictionEvent` (nullable for standalone markets).

```ts
interface Market {
  id: MarketId;           // branded string — Polymarket's conditionId or slug
  eventId: EventId | null;
  slug: string;
  title: string;
  description: string;
  category: MarketCategory; // politics | crypto | sports | economics | science | culture | other
  status: MarketStatus;     // active | closed | resolved
  outcomes: Outcome[];
  volumeUsd: number;
  liquidityUsd: number;
  resolvesAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### `Outcome`

One side of a market (Yes/No, or a named candidate/option). Current `price` is a probability in [0, 1].

```ts
interface Outcome {
  id: OutcomeId;
  marketId: MarketId;
  name: string;
  price: number;   // 0.0–1.0, represents current market probability
  shares: number;
}
```

### `PredictionEvent`

A grouping of related markets (e.g., "2024 US Presidential Election"). One event may contain dozens of markets (national winner, state outcomes, electoral vote totals).

```ts
interface PredictionEvent {
  id: EventId;
  slug: string;
  title: string;
  description: string;
  category: MarketCategory;
  marketIds: MarketId[];
  createdAt: Date;
}
```

### `PriceTick`

A historical snapshot of one outcome's price at a point in time. Written by the ingestion graph on each run.

```ts
interface PriceTick {
  marketId: MarketId;
  outcomeId: OutcomeId;
  price: number;      // 0.0–1.0
  timestamp: Date;
}
```

This is time-series data. The table grows quickly for active markets. Composite index on `(market_id, outcome_id, timestamp)` is required. TimescaleDB is a future option if vanilla Postgres indexing becomes a bottleneck (see `docs/08-risks.md`).

### `Trade`

A single trade captured from the CLOB API. Used for activity feed and top-trader analysis.

```ts
interface Trade {
  id: string;
  marketId: MarketId;
  outcomeId: OutcomeId;
  side: "buy" | "sell";
  size: number;        // dollar value
  price: number;       // outcome price at time of trade
  walletAddress: string;
  timestamp: Date;
}
```

### `Insight`

The output of one AI analysis run. A single run produces one or more `Insight` objects.

```ts
interface Insight {
  id: string;
  marketId: MarketId | null;
  eventId: EventId | null;
  kind: "intelligence" | "edge" | "discrepancy";
  summary: string;      // one-sentence summary for list views
  narrative: string;    // full markdown narrative for detail view
  signals: EdgeSignal[] | DiscrepancySignal[] | null;
  model: string;        // which LLM produced this
  runId: string;        // links to AnalysisRun
  generatedAt: Date;
}
```

### `AnalysisRun`

A record of one LangGraph execution. Tracks progress for SSE streaming and auditability.

```ts
interface AnalysisRun {
  id: string;
  kind: "intelligence" | "edge" | "discrepancy";
  marketId: MarketId | null;
  eventId: EventId | null;
  status: "running" | "completed" | "failed";
  currentNode: string | null;
  startedAt: Date;
  completedAt: Date | null;
  error: string | null;
}
```

### `Watchlist`

User-scoped list of tracked market IDs. In MVP, backed by localStorage on the front-end. In v1, persisted in Postgres per user.

```ts
interface Watchlist {
  id: string;
  userId: string;
  marketIds: MarketId[];
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Persistence sketch (Postgres tables, M1)

```
prediction_events   (id, slug, title, description, category, market_ids jsonb, created_at)

markets             (id, event_id, slug, title, description, category, status,
                     volume_usd, liquidity_usd, resolves_at, created_at, updated_at)

outcomes            (id, market_id, name, price, shares)
                    — denormalized subset also stored in markets.outcomes jsonb for fast reads

price_ticks         (market_id, outcome_id, price, timestamp)
                    — composite index on (market_id, outcome_id, timestamp DESC)
                    — candidate for TimescaleDB hypertable in M3+

trades              (id, market_id, outcome_id, side, size, price, wallet_address, timestamp)
                    — index on (market_id, timestamp DESC)

insights            (id, market_id, event_id, kind, summary, narrative, signals jsonb,
                     model, run_id, generated_at)
                    — index on (market_id, kind, generated_at DESC)

analysis_runs       (id, kind, market_id, event_id, status, current_node,
                     started_at, completed_at, error)

watchlists          (id, user_id, market_ids jsonb, created_at, updated_at)

embeddings          (id, ref_id, ref_type, collection, vector vector(1024), payload jsonb)
                    — pgvector; used for semantic search over market descriptions and insights
```

## Key design decisions

- `outcomes` are embedded as JSONB in `markets` for fast single-market reads (avoiding a join on every dashboard row), and also stored in a normalised `outcomes` table for price-tick foreign-key references.
- `signals` is JSONB on `insights` because its shape varies by `kind`.
- `price_ticks` has no surrogate key — the natural composite of `(market_id, outcome_id, timestamp)` is sufficient.
- Watchlist `market_ids` is JSONB because the list is always read and written atomically.
