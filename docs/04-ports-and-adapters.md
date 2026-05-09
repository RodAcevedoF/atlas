# Port & Adapter Catalog

All port interfaces live in `packages/application/src/ports/`. All adapter implementations live in `packages/infrastructure/<name>-<tech>/src/index.ts`.

## Outbound ports (defined in `@atlas/application`)

### `MarketDataPort` — `ports/market-data.ts`

Provider-agnostic interface for fetching prediction-market data. Drives the ingestion graph and provides on-demand data to analysis graphs.

```ts
interface MarketDataPort {
  listMarkets(filter?: MarketFilter): Promise<Market[]>;
  getMarket(id: MarketId): Promise<Market | null>;
  listEvents(filter?: { category?: MarketCategory; limit?: number }): Promise<PredictionEvent[]>;
  getEvent(id: EventId): Promise<PredictionEvent | null>;
  getPriceHistory(marketId: MarketId, range: PriceHistoryRange): Promise<PriceTick[]>;
  getRecentTrades(marketId: MarketId, limit?: number): Promise<Trade[]>;
}
```

**Planned adapter:** `PolymarketAdapter` in `@atlas/infra/market-polymarket`  
**Data sources:** Gamma API (`gamma-api.polymarket.com`) for markets/events; CLOB API (`clob.polymarket.com`) for prices/trades. Both are public REST APIs requiring no auth for reads.  
**Future adapters:** `KalshiAdapter`, `ManifoldAdapter` — same interface, different providers. See [ADR 0006](./adr/0006-provider-agnostic-market-data-port.md).

---

### `MarketStorePort` — `ports/market-store.ts`

Persist and retrieve all market-domain entities from Postgres.

**Planned adapter:** `DrizzleMarketStore` in `@atlas/infra/store-drizzle`  
**Implementation notes:** Drizzle ORM over Postgres. `price_ticks` table requires composite index on `(market_id, outcome_id, timestamp DESC)`. `outcomes` denormalized into `markets.outcomes` JSONB for fast reads.

---

### `LLMPort` — `ports/llm.ts`

Text completion and streaming for narrative synthesis, fair-value estimation, and discrepancy explanation.

**Planned adapter:** `AnthropicLLMAdapter` in `@atlas/infra/llm-anthropic`  
**Model routing:** `claude-haiku-4-5` for cheap per-item classification (edge explain, discrepancy explain); `claude-sonnet-4-6` for full narrative synthesis. Prompt caching on system prompts shared within a graph run.

---

### `EmbeddingPort` — `ports/embedding.ts`

Generate embeddings for semantic search over market descriptions and insights.

**Planned adapter:** Shares `AnthropicLLMAdapter` or a dedicated embedding adapter.  
**Use:** Semantic market search ("find markets related to Fed monetary policy"); future: cluster related markets for discrepancy detection.

---

### `VectorStorePort` — `ports/vector-store.ts`

Similarity search over embedded market/insight text.

**Planned adapter:** `PgvectorAdapter` in `@atlas/infra/vectorstore-pgvector`  
**Collection:** `market-descriptions` for market text; `insights` for generated insight text.

---

### `NewsPort` — `ports/news.ts` *(interface only — M5)*

Search recent news by query and date range. Adds context to intelligence and edge graphs.

```ts
interface NewsPort {
  search(filter: NewsFilter): Promise<NewsArticle[]>;
}
```

**No adapter package yet.** Provider TBD (NewsAPI, GDELT, or similar). Plug-in: the intelligence graph has a `fetch-news` parallel branch that is a no-op until this port is wired.

---

### `OnChainPort` — `ports/onchain.ts` *(interface only — M6)*

Query Polygon onchain data: top traders, wallet activity for a given market.

```ts
interface OnChainPort {
  getTopTraders(marketId: MarketId, limit?: number): Promise<TopTrader[]>;
  getWalletActivity(walletAddress: string, marketId?: MarketId): Promise<{ volume: number; positions: number }>;
}
```

**No adapter package yet.** Will use The Graph subgraph on Polygon. Plug-in: market detail page "Top Traders" panel is hidden until wired.

---

### `OrchestrationPort` — `ports/orchestration.ts`

Run a named LangGraph, stream its events, resume from checkpoints.

**Planned adapter:** `LangGraphOrchestration` in `@atlas/infra/orchestration-langgraph`  
See [ADR 0005](./adr/0005-langgraph-behind-an-orchestration-port.md).

---

### `EventBusPort` — `ports/event-bus.ts`

Publish domain events (price moves, graph node progress) that the API streams to the browser via SSE.

**Planned adapter:** `SseEventBus` in `@atlas/infra/eventbus-sse`

---

### `JobQueuePort` — `ports/job-queue.ts`

Enqueue and process background jobs (ingestion, edge scan, discrepancy scan).

**Planned adapter:** `PostgresJobQueue` in `@atlas/infra/queue-postgres`

---

### `ClockPort` / `IdPort` — `ports/utilities.ts`

Small seams for testability.

## Inbound adapters (in `apps/`)

- **`apps/api`** — Fastify HTTP + SSE. Translates HTTP requests into use-case calls. Owns the SSE `/events` route that streams `EventBusPort` events.
- **`apps/web`** — React SPA. Consumes REST + SSE. No domain logic.
- **`apps/worker`** — Bun process. Registers `JobQueuePort` handlers that call use cases (ingestion, scans).
