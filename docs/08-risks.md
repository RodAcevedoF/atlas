# Risks & Mitigations

## R1 — AI estimates treated as financial advice (high impact, medium probability)

**Risk:** Users treat Edge Finder output as trading signals and lose money. Legal and reputational exposure.

**Why it matters:** Prediction market "edge" estimates produced by an LLM reasoning over incomplete information are not reliable alpha-generating signals. If the product is perceived as giving financial advice, it creates liability and erodes trust when picks are wrong.

**Mitigations:**
- Prominent disclaimer on `/edges` and in every edge insight: "This is AI-generated analysis for research purposes. Not financial advice."
- Edge estimates show confidence intervals, not point estimates.
- "How this works" tooltip explaining the LLM reasoning process and its limitations.
- Product docs clearly state Atlas is read-only research tooling.

---

## R2 — Polymarket API rate limits (medium impact, high probability)

**Risk:** The ingestion graph hammers the Gamma/CLOB API and gets rate-limited, causing stale data or ingestion failures.

**Polymarket rate limits:** Gamma API is permissive for read-only use. CLOB API has stricter limits. Specific numbers are not publicly documented — must be observed empirically.

**Mitigations:**
- Ingestion fan-out is capped (configurable, default: 20 concurrent market fetches).
- Exponential backoff + jitter on 429 responses in `PolymarketAdapter`.
- Cache aggressively in `MarketStorePort`: don't re-fetch markets that were updated recently (configurable TTL).
- Prioritise fetching active high-volume markets; skip low-liquidity markets on each cycle.
- Monitor rate-limit errors in the ingestion graph's `AnalysisRun` records.

---

## R3 — LLM cost on Edge Graph fan-out (high impact, medium probability)

**Risk:** Edge graph calls Sonnet for fair-value estimation per market. At 50 markets × Sonnet pricing, one scan run costs significantly.

**Cost levers:**
- Limit markets per scan (default: top 50 by volume; configurable).
- Use Haiku for the per-market classification step; only use Sonnet for synthesis and top-K narratives.
- Prompt caching: the estimation system prompt is identical across all markets in a run.
- Cache edge insights — don't re-run a market's estimate if the price hasn't changed significantly since last run.
- Track cost per run in `AnalysisRun` metadata; alert if a run exceeds a budget threshold.

**Target:** Under $1 per hourly edge scan run at 50 markets.

---

## R4 — Price tick storage growth (medium impact, high probability)

**Risk:** Writing a price tick per outcome per market every 5 minutes accumulates rapidly. At 1,000 active markets × 2 outcomes × 12 ticks/hour = 24,000 rows/hour = ~210M rows/year.

**Mitigations:**
- Only write ticks for active markets above a volume threshold (default: $10k volume).
- Retention policy: delete ticks older than 90 days (configurable).
- If vanilla Postgres indexing degrades: evaluate TimescaleDB hypertables for the `price_ticks` table. The `MarketStorePort` interface means the storage layer can be changed without touching application logic.
- Defer this decision to M2 when we have real volume numbers to measure against.

---

## R5 — Polymarket data accuracy (medium impact, low probability)

**Risk:** The Gamma/CLOB API returns stale or incorrect data. Insights generated from bad data are wrong.

**Mitigations:**
- Cross-validate key prices against the CLOB orderbook mid-price when they diverge by more than 2%.
- Expose data timestamp on all UI price displays ("prices as of 14:32 UTC").
- The `PriceTick` table preserves history, making anomalies detectable.

---

## R6 — LangGraph + Bun compatibility (low impact, low probability)

**Risk:** `@langchain/langgraph` uses features that Bun doesn't yet support (e.g., certain Node.js async_hooks APIs used by the checkpointer).

**Mitigation:**
- Validate `@langchain/langgraph` + Postgres checkpointer under Bun in M1 Day 1.
- The `OrchestrationPort` abstraction means if LangGraph fails under Bun, the adapter can run in a separate Node.js child process without changing graph definitions.
- LangGraph is a pure ESM package — less likely to have Bun compatibility issues than native addons.
