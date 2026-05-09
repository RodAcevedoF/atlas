# Atlas Documentation

This directory is the single source of truth for Atlas product and architecture decisions. Read these before touching code.

## Reading order for new contributors

1. [Vision](./01-vision.md) — what problem we solve and why we're different
2. [Product](./02-product.md) — the three modules and what each surface does
3. [Architecture](./03-architecture.md) — the dependency rule and layer map
4. [Ports & Adapters](./04-ports-and-adapters.md) — every port interface and its planned adapter
5. [LangGraph Design](./05-langgraph-design.md) — the four AI graphs node by node
6. [Data Model](./06-data-model.md) — domain entities and persistence sketch
7. [Roadmap](./07-roadmap.md) — milestones and what lands when
8. [Risks](./08-risks.md) — known hard problems and mitigations
9. [Conventions](./09-conventions.md) — naming, error handling, testing approach

## Architecture Decision Records

Major technical choices are recorded as ADRs so future maintainers understand why things are the way they are.

- [ADR 0001 — Use Bun as runtime](./adr/0001-use-bun-as-runtime.md)
- [ADR 0002 — Nx monorepo layout](./adr/0002-nx-monorepo-layout.md)
- [ADR 0003 — Ports & adapters architecture](./adr/0003-ports-and-adapters-architecture.md)
- [ADR 0004 — Postgres + pgvector as single store](./adr/0004-postgres-with-pgvector-as-single-store.md)
- [ADR 0005 — LangGraph behind an OrchestrationPort](./adr/0005-langgraph-behind-an-orchestration-port.md)
- [ADR 0006 — Provider-agnostic MarketDataPort](./adr/0006-provider-agnostic-market-data-port.md)

When you make a significant technical choice, add a new ADR. Use [the template](./adr/0000-template.md).
