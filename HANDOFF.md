# Session Handoff

## What was done this session

### Pivot: codebase-onboarding → Polymarket predictive platform

The scaffold was fully pivoted from "Atlas — AI codebase onboarding" to "Atlas — AI predictive analytics on Polymarket data". Same stack, same hexagonal architecture, same Nx workspace. New domain.

### Three product modules planned
- **A. Market Intelligence** — on-demand AI deep-dive per market/event (ships first, M2)
- **B. Edge Finder** — periodic AI scan for fair-value vs market-price gaps (M3)
- **C. Discrepancy Detector** — cross-market probability consistency checker (M4)

### Infrastructure changes
- **Dropped** adapter packages: `git-simple-git`, `parser-tree-sitter`, `search-ripgrep`
- **Added** adapter package: `@atlas/infra/market-polymarket` (stub, implements `MarketDataPort`)
- **Replaced** domain entities: now `Market`, `Outcome`, `PredictionEvent`, `PriceTick`, `Trade`, `Insight`, `AnalysisRun`, `Watchlist`
- **Replaced** ports: `RepoStorePort` → `MarketStorePort`; dropped `GitPort`/`ParserPort`/`SearchPort`; added `MarketDataPort`, `NewsPort` (interface only), `OnChainPort` (interface only)
- **Replaced** use cases: `IngestMarkets`, `RunMarketIntelligence`, `RunEdgeScan`, `RunDiscrepancyScan`, `AskAboutMarket`, `ManageWatchlist`
- **Rewrote** 7 docs: vision, product, ports-and-adapters, langgraph-design, data-model, roadmap, risks
- **Added** ADR 0006: provider-agnostic MarketDataPort

### Four LangGraph graphs designed (docs only, not implemented)
1. Ingestion (cron, no LLM)
2. Intelligence (on-demand, Module A)
3. Edge (cron, Module B)
4. Discrepancy (cron, Module C)

### `bun install` — ✅ succeeded (217 packages, 16s)

---

## What's left for next session

### 1. Fix `bun nx run-many -t typecheck` — one step away

`bun-types@1.3.13` is already installed (added to root `package.json` devDependencies). The only remaining failure is `apps/api` and `apps/worker` — they need `"types": ["bun-types"]` in their `compilerOptions` so TypeScript sees `process`, `console`, and other Bun/Node globals.

Fix: add to `apps/api/tsconfig.json` and `apps/worker/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ESNext"],
    "types": ["bun-types"]
  },
  "include": ["src"]
}
```

Then verify `bun nx run-many -t typecheck` is fully green.

### 2. Commit M0

Once typecheck passes, git init + first commit:
```bash
git init
git add .
git commit -m "M0: scaffold — prediction-market domain, hexagonal architecture, 6 ADRs"
```

### 3. Start M1 — data layer

See `docs/07-roadmap.md` M1 section. Key first steps:
- `docker compose up` with Postgres + pgvector
- Drizzle schema (`packages/infrastructure/store-drizzle/src/schema.ts`)
- `PolymarketAdapter` — implement `listMarkets` against Gamma API first
- Validate LangGraph + Bun compatibility (Risk R6 — do this on day 1 of M1)

---

## Workspace quick reference

```
apps/web       React + Rsbuild  :3000
apps/api       Fastify + Bun    :3001  (GET /health works)
apps/worker    Bun stub

packages/domain              Market domain entities
packages/application         Port interfaces + use-case signatures
packages/orchestration       Empty barrel — LangGraph graphs land here in M1
packages/infrastructure/
  market-polymarket          MarketDataPort stub (Polymarket Gamma + CLOB)
  store-drizzle              MarketStorePort stub (Drizzle + Postgres)
  llm-anthropic              LLMPort stub
  vectorstore-pgvector       VectorStorePort stub
  orchestration-langgraph    OrchestrationPort stub
  eventbus-sse               EventBusPort stub
  queue-postgres             JobQueuePort stub
```

Key commands:
```bash
bun nx run-many -t typecheck     # should be green after web tsconfig fix
bun nx run @atlas/api:dev        # starts Fastify on :3001
bun nx run @atlas/web:dev        # starts Rsbuild on :3000
bun nx graph                     # visualise dependency graph
```

Design docs: `docs/00-readme.md` → index of all docs and ADRs.
