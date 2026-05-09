# Roadmap

## M0 — Scaffold (current)

**Goal:** Nx workspace with clean hexagonal layout, all port interfaces and adapter stubs for the prediction-market domain, design docs written.

Deliverables:
- [x] Nx workspace — Bun + Biome + Rsbuild
- [x] `@atlas/domain` — market domain entities (Market, Outcome, PredictionEvent, PriceTick, Trade, Insight, AnalysisRun, Watchlist)
- [x] `@atlas/application` — port interfaces (MarketDataPort, MarketStorePort, LLMPort, EmbeddingPort, VectorStorePort, OrchestrationPort, EventBusPort, JobQueuePort, NewsPort, OnChainPort)
- [x] `@atlas/orchestration` — empty barrel (4 graphs land in M1)
- [x] All infra adapter stubs (llm-anthropic, vectorstore-pgvector, market-polymarket, store-drizzle, orchestration-langgraph, eventbus-sse, queue-postgres)
- [x] `apps/api` — Fastify `/health`; `apps/web` — React hello; `apps/worker` — Bun stub
- [x] Design docs (this file and siblings), 6 ADRs
- [ ] `bun install` + `bun nx run-many -t typecheck` green

---

## M1 — Data layer: ingest + store

**Goal:** Live Polymarket data flowing into local Postgres. No AI yet.

Deliverables:
- Docker compose: Postgres + pgvector
- Drizzle schema + migrations (`packages/infrastructure/store-drizzle/src/schema.ts`)
- `PolymarketAdapter` — real implementation:
  - `listMarkets`, `getMarket` via Gamma API
  - `listEvents`, `getEvent` via Gamma API
  - `getRecentTrades`, `getPriceHistory` via CLOB API
- `DrizzleMarketStore` — all methods implemented
- `PgvectorAdapter` — basic upsert + search
- `LangGraphOrchestration` — run ingestion graph; Postgres checkpointer
- Ingestion graph — fetch markets, upsert, snapshot prices, detect large moves
- `SseEventBus` + Fastify SSE route — stream ingestion events to browser
- `PostgresJobQueue` — enqueue ingestion job from worker; process in worker
- API routes: `GET /markets`, `GET /markets/:id`, `GET /events`, `GET /events/:id`

**Verification:** Run worker locally → Polymarket markets appear in `GET /markets`. Price ticks accumulate on each run. Large move detected for a manually-simulated price change.

---

## M2 — Module A: Market Intelligence UI

**Goal:** Full market intelligence flow with streaming AI analysis.

Deliverables:
- `AnthropicLLMAdapter` — implemented with prompt caching (cache system prompt per graph run)
- Intelligence graph — all nodes implemented in `@atlas/orchestration`
- `RunMarketIntelligence` use case implementation
- Web: dashboard (`/`), event page (`/events/:id`), market detail (`/markets/:id`)
  - Price chart (Recharts)
  - Outcomes table with live prices
  - Analysis panel: "Run Analysis" button → streams via SSE → renders narrative + checklist
  - Related markets panel
  - Recent trades feed
- Web: watchlist (`/watchlist`) — localStorage-backed in MVP

**Verification:** Navigate to a real Polymarket market in Atlas. Run analysis. Streaming narrative appears. All cited prices and moves reference actual data in the DB.

---

## M3 — Module B: Edge Finder

**Goal:** Periodic AI scan surfacing underpriced opportunities.

Deliverables:
- Edge graph implemented in `@atlas/orchestration`
- `RunEdgeScan` use case implementation
- Worker: hourly edge scan cron job
- Web: `/edges` — ranked list with fair-value estimates, edge %, AI rationale
- Prominent disclaimer: research tool, not financial advice

---

## M4 — Module C: Discrepancy Detector

**Goal:** Cross-market consistency analysis per event.

Deliverables:
- Discrepancy graph implemented in `@atlas/orchestration`
- `RunDiscrepancyScan` use case implementation
- Worker: hourly discrepancy scan cron job per active event
- Web: `/discrepancies` — list of inconsistencies with magnitude and explanation

---

## M5 — News enrichment

**Goal:** Wire `NewsPort` to add news context to the intelligence and edge graphs.

Deliverables:
- `NewsPort` adapter (provider TBD: NewsAPI, GDELT, or similar)
- Update intelligence graph: `fetch-news` parallel branch populated
- Update edge graph: news context added to fair-value estimation prompt
- Web: news citations appear in Analysis panel

---

## M6+ — Onchain enrichment + multi-provider

Deliverables (order TBD):
- `OnChainPort` adapter (Polygon subgraph via The Graph)
- Top-trader panel on market detail page
- `KalshiAdapter` implementing `MarketDataPort` (adds regulated US market data)
- Auth + multi-user watchlists (Clerk or Lucia)
- Self-hosted deployment guide (Fly.io or Railway)
