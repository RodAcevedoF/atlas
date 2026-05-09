# CLAUDE.md — Atlas Repo Conventions

This file guides AI assistants working in this repo. Read before writing any code.

## Architecture rule (non-negotiable)

**Dependencies point inward.** Domain ← Application ← Infrastructure ← Apps.

| Package | Layer | May import from |
|---|---|---|
| `@atlas/domain` | Domain | nothing |
| `@atlas/shared` | Shared | nothing |
| `@atlas/application` | Application | `@atlas/domain`, `@atlas/shared` |
| `@atlas/orchestration` | Application | `@atlas/domain`, `@atlas/application`, `@atlas/shared` |
| `@atlas/infra/*` | Infrastructure | `@atlas/application`, `@atlas/domain`, `@atlas/shared` |
| `@atlas/ui` | UI | `@atlas/shared` |
| `apps/*` | Composition root | anything |

**Never import an adapter (`@atlas/infra/*`) from `@atlas/application` or `@atlas/orchestration`.** That reverses the dependency direction and breaks the architecture.

**Never put business logic in an adapter.** Adapters translate; they don't decide.

**Never import from `apps/*` in any package.** Apps are composition roots, not libraries.

## Where new code goes

- New entity or value object → `packages/domain/src/entities/`
- New external capability (LLM, data source, DB) → define a port in `packages/application/src/ports/`, then implement in a new `packages/infrastructure/<name>-<tech>/` package
- New use case → interface in `packages/application/src/use-cases/`, implementation class in the same directory
- New AI graph → `packages/orchestration/src/graphs/<name>.ts`
- New API route → `apps/api/src/routes/<name>.ts`
- New UI page → `apps/web/src/routes/<name>.tsx`
- New shared UI component → `packages/ui/src/`

## Infrastructure adapters

| Adapter package | Port implemented | Technology |
|---|---|---|
| `@atlas/infra/market-polymarket` | `MarketDataPort` | Polymarket Gamma + CLOB APIs |
| `@atlas/infra/store-drizzle` | `MarketStorePort` | Drizzle ORM + Postgres |
| `@atlas/infra/llm-anthropic` | `LLMPort` | Anthropic SDK |
| `@atlas/infra/vectorstore-pgvector` | `VectorStorePort` | pgvector extension |
| `@atlas/infra/orchestration-langgraph` | `OrchestrationPort` | LangGraph + Postgres checkpointer |
| `@atlas/infra/eventbus-sse` | `EventBusPort` | In-process pub/sub → SSE |
| `@atlas/infra/queue-postgres` | `JobQueuePort` | Postgres-backed job queue |

`NewsPort` and `OnChainPort` are interface-only — no adapter packages yet (M5/M6).

## Adding a port + adapter (checklist)

1. Define the interface in `packages/application/src/ports/<name>.ts`
2. Export it from `packages/application/src/index.ts`
3. Create `packages/infrastructure/<name>-<tech>/` with `package.json`, `tsconfig.json`, `project.json`, `src/index.ts` (stub throwing `NotImplementedError`)
4. Add the path alias to `tsconfig.base.json`
5. Wire concrete adapter in `apps/api/src/main.ts` or `apps/worker/src/main.ts`
6. Never import the adapter from `application` or `orchestration`

## Commands

```bash
bun install                    # install deps
bun nx run-many -t typecheck   # typecheck all packages
bun nx run-many -t lint        # lint check
bun lint:fix                   # lint + auto-fix
bun nx run @atlas/api:dev      # run API with hot reload
bun nx run @atlas/web:dev      # run web dev server
bun nx graph                   # visualize dependency graph
```

## Code style

- Biome handles formatting and linting. Run `bun lint:fix` before committing.
- No `console.log` in `apps/api` — use `req.log` or `app.log` (Fastify pino).
- No `any`. No `!` non-null assertions without a comment explaining why.
- `import type` for type-only imports (enforced by `verbatimModuleSyntax`).
- Named exports everywhere. No default exports.
- No comments unless the WHY is non-obvious.

## LangGraph graphs (4 total)

All defined in `packages/orchestration/src/`. Node functions are plain TypeScript — no LangGraph imports in this package. The LangGraph runtime is injected by `@atlas/infra/orchestration-langgraph`.

| Graph | Trigger | Purpose |
|---|---|---|
| Ingestion | Cron (every 5 min) | Fetch + cache Polymarket data, snapshot price ticks |
| Intelligence | On-demand per market/event | AI narrative deep-dive (Module A) |
| Edge | Cron (hourly) | Fair-value scan across active markets (Module B) |
| Discrepancy | Cron (hourly per event) | Cross-market consistency check (Module C) |

See `docs/05-langgraph-design.md` for node-by-node design.

## Docs

Update `docs/` when making architectural decisions or changing product scope. Add an ADR (`docs/adr/`) for significant tech choices. Use the template at `docs/adr/0000-template.md`.
