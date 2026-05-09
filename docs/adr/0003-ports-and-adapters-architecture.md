# ADR 0003 — Ports & Adapters (Hexagonal) Architecture

**Status:** Accepted  
**Date:** 2026-05-06

## Context

Atlas integrates many external technologies: Anthropic LLM, pgvector, simple-git, tree-sitter, ripgrep, Drizzle, LangGraph. Without clear separation, these dependencies leak into business logic, making the codebase:
- Hard to test (must spin up real Postgres to test a use case)
- Hard to swap (changing from pgvector to Qdrant requires touching business logic)
- Hard to understand (what is framework, what is product logic?)

## Decision

Use **ports & adapters architecture** (hexagonal / clean architecture) with four layers:

1. **Domain** — entities and value objects, no I/O
2. **Application** — use cases + outbound port *interfaces*, no I/O
3. **Infrastructure** — one package per adapter, implements a port interface using a specific technology
4. **Apps** — composition roots, wire adapters to ports

The **dependency rule** is: imports point inward only. Domain ← Application ← Infrastructure ← Apps.

## Consequences

**Positive:**
- Use cases are testable with zero infrastructure: inject fake adapters, no Docker required.
- Swapping an adapter (e.g., pgvector → Qdrant) only requires writing a new `VectorStorePort` implementation. No use-case changes.
- Clear mental model: if you're asking "where does this belong?", the answer is almost always derivable from the layer rule.
- New team members (or future AI assistants) have a documented pattern to follow.

**Negative:**
- More boilerplate: every external interaction requires an interface + adapter + wiring. For a solo project, this is real overhead.
- The `OrchestrationPort` interface adds a level of indirection over LangGraph that would not be necessary if we just imported LangGraph directly in use cases.
- Module boundary enforcement is convention-based only (no mechanical linting enforcement for now).

**Neutral:**
- LangGraph graph definitions live in `@atlas/orchestration` as application-layer orchestration. This is a deliberate choice: the graph topology encodes business workflow, so it belongs with the application, not the infrastructure.

## Alternatives considered

- **Direct dependencies (no ports)**: simplest, least code. Rejected because it makes use cases untestable and adapter swapping costly. The test story is the primary reason for the choice.
- **Clean Architecture strict version (use-case interactors as classes, request/response models)**: more ceremony. Rejected in favour of use cases as interfaces with execute() methods — simpler and sufficient for this project size.
