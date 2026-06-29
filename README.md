# Atlas

AI-powered predictive analytics for prediction markets. Built on multi-sourced data and powered by LLMs.

Three modules, one data layer:

- **Market Intelligence** — on-demand AI deep-dive on any market or event: price history, key moves, narrative report, forecast checklist
- **Edge Finder** — periodic AI scan across active markets, fair-value estimates vs market price, ranked opportunities
- **Discrepancy Detector** — cross-market consistency analysis; flags when related markets imply inconsistent probabilities

Read-only. No trading, no wallet integration. Research tooling.

## Stack

| Layer | Tech |
|---|---|
| Runtime | Bun |
| API | Fastify |
| Frontend | React + Rsbuild |
| UI components | shadcn |
| Monorepo | Nx |
| Linter / formatter | Biome |
| AI orchestration | LangGraph (4 graphs) |
| LLM | Anthropic (Haiku + Sonnet) |
| Data source | Polymarket (Gamma + CLOB APIs) |
| Database | Postgres + pgvector |
| ORM | Drizzle |

Architecture: **ports & adapters** (hexagonal). `MarketDataPort` is provider-agnostic — Kalshi/Manifold can be added later without touching application logic. See [docs/03-architecture.md](./docs/03-architecture.md).

## Quickstart (local dev)

```bash
bun install
bun nx run-many -t typecheck   # verify everything compiles

# API (terminal 1)
bun nx run @atlas/api:dev

# Web (terminal 2)
bun nx run @atlas/web:dev

# Worker (terminal 3)
bun nx run @atlas/worker:dev
```

Web: http://localhost:3000 · API: http://localhost:3001 · Health: http://localhost:3001/health

## Documentation

See [docs/00-readme.md](./docs/00-readme.md) for the full documentation index.

## Current status

**M0 (scaffold)** — workspace skeleton, all port interfaces, all adapter stubs, design docs. No live data yet.

See [docs/07-roadmap.md](./docs/07-roadmap.md) for the milestone plan.
