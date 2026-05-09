# LangGraph Design

Atlas has four LangGraph graphs, all defined in `packages/orchestration/src/`. Graph node functions call into `@atlas/application` ports — never into adapters directly. The LangGraph runtime is wired in `@atlas/infra/orchestration-langgraph` via `OrchestrationPort`. See [ADR 0005](./adr/0005-langgraph-behind-an-orchestration-port.md).

---

## Graph 1 — Ingestion Graph

**Trigger:** Scheduled worker job (cron, every 5 min for active markets).  
**Purpose:** Keep the local Postgres cache of market data fresh.

```
list-markets → fan-out per market:
  ├── fetch-current-state (Gamma API)
  └── fetch-recent-trades (CLOB API)
→ upsert (MarketStorePort)
→ snapshot-prices (write PriceTick per outcome)
→ detect-large-moves (compare to previous tick; if Δ > threshold)
→ emit-move-event (EventBusPort → SSE → front-end alert)
```

### State shape

```ts
interface IngestionState {
  runId: string;
  filter: MarketFilter;
  markets: Market[];
  upserted: number;
  ticksRecorded: number;
  largeMoves: Array<{ marketId: string; outcomeName: string; deltaPct: number }>;
}
```

### Notes
- Fan-out is capped (default: 20 concurrent market fetches) to respect Polymarket rate limits.
- Large-move threshold is configurable (default: 5% absolute move in a single interval).
- No LLM calls in this graph — pure data plumbing.

---

## Graph 2 — Intelligence Graph (Module A)

**Trigger:** On-demand, per `RunMarketIntelligence.execute()` call.  
**Purpose:** Deep AI analysis of a single market or event.

```
load-target
→ parallel:
  ├── fetch-price-history (MarketDataPort.getPriceHistory, last 30 days)
  ├── fetch-related-markets (same event; MarketStorePort.listMarkets filtered by eventId)
  ├── fetch-recent-trades (MarketDataPort.getRecentTrades, last 100)
  └── fetch-news [future] (NewsPort.search when wired)
→ identify-key-events (LLM: correlate price moves with timestamps; Haiku)
→ synthesize-narrative (LLM: full report draft; Sonnet)
→ extract-forecast-checklist (LLM: bullet list of signals to watch; Sonnet)
→ save-insight (MarketStorePort.saveInsight)
```

### State shape

```ts
interface IntelligenceState {
  runId: string;
  marketId: string | null;
  eventId: string | null;
  market: Market | null;
  event: PredictionEvent | null;
  priceHistory: PriceTick[];
  relatedMarkets: Market[];
  recentTrades: Trade[];
  newsArticles: NewsArticle[];   // empty until NewsPort wired
  keyEvents: Array<{ timestamp: Date; description: string; priceDelta: number }>;
  narrativeDraft: string;
  forecastChecklist: string[];
  insight: Insight | null;
}
```

### Streaming

Each node emits `node:start` / `node:end` events via `EventBusPort`. The market detail page SSE subscription shows "Fetching price history…", "Analyzing moves…", "Writing report…" in real time as the graph executes.

---

## Graph 3 — Edge Graph (Module B)

**Trigger:** Scheduled (e.g., once per hour) via worker job.  
**Purpose:** Scan active markets, estimate fair value, rank by edge.

```
filter-markets (active, volume ≥ threshold, category)
→ fan-out per market:
  ├── fetch-context (price history + recent trades)
  └── fair-value-estimate (LLM: given all context, what probability is justified? Sonnet)
→ compute-edge (|estimate - market_price|)
→ filter (edge > min_threshold)
→ rank-by-edge (descending)
→ narrative-for-top-k (LLM: one paragraph per top pick; Haiku)
→ save-insights (MarketStorePort.saveInsight, kind = "edge")
```

### State shape

```ts
interface EdgeState {
  runId: string;
  filter: { categories: MarketCategory[]; minVolumeUsd: number; topK: number };
  candidates: Market[];
  contexts: Record<string, { priceHistory: PriceTick[]; trades: Trade[] }>;
  estimates: Record<string, { outcomeId: string; fairValue: number; marketPrice: number; edge: number }[]>;
  ranked: EdgeSignal[];
  insights: Insight[];
}
```

### Cost control
Fan-out per market calls Sonnet for fair-value estimation — this is the expensive step. Cap markets scanned per run (default: top 50 by volume). Track cost per run in `AnalysisRun` metadata.

---

## Graph 4 — Discrepancy Graph (Module C)

**Trigger:** Scheduled (e.g., once per hour per active event) via worker job.  
**Purpose:** Detect cross-market probability inconsistencies within an event.

```
load-event
→ load-related-markets (all markets under the event)
→ compute-implied-distributions
  (e.g. for a presidential election: sum state-level Trump prices weighted by electoral votes → implied national probability)
→ compare-to-national-market (numerical diff)
→ detect-inconsistencies (threshold: Δ > 3%)
→ for each inconsistency:
  explain-why (LLM: hypothesis for the gap; Haiku)
→ rank-by-magnitude
→ save-insights (MarketStorePort.saveInsight, kind = "discrepancy")
```

### State shape

```ts
interface DiscrepancyState {
  runId: string;
  eventId: string;
  event: PredictionEvent;
  markets: Market[];
  impliedDistributions: Record<string, number>;  // outcome → implied probability
  marketPrices: Record<string, number>;           // outcome → market price
  inconsistencies: Array<{ description: string; magnitude: number; marketIds: string[] }>;
  explanations: Array<{ inconsistency: string; hypothesis: string }>;
  insights: Insight[];
}
```

### Notes
The distribution computation is deterministic math, not LLM. Only the `explain-why` step uses an LLM (Haiku is sufficient). This graph is very cheap to run.

---

## LangGraph placement and dependency rule

Graph definitions and node functions live in `@atlas/orchestration`. Node functions import from `@atlas/application` (ports and use-case types) and `@atlas/domain` (entities), never from `@atlas/infra/*`.

The LangGraph runtime (`@langchain/langgraph`, Postgres checkpointer) is imported only inside `@atlas/infra/orchestration-langgraph`. The adapter compiles graph definitions from `@atlas/orchestration` into runnable `StateGraph` instances at startup.

This means `@atlas/orchestration` nodes are testable as pure functions with fake port implementations — no LangGraph runtime needed in tests.
