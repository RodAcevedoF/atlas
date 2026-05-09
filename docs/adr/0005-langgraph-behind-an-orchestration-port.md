# ADR 0005 — LangGraph Behind an OrchestrationPort

**Status:** Accepted  
**Date:** 2026-05-06

## Context

The indexing, Q&A, and watch graphs are the core AI feature of Atlas. They must be implemented in `@atlas/orchestration` (application-layer orchestration). The question is: does `@atlas/orchestration` import `@langchain/langgraph` directly, or does it depend on an abstraction?

Two options:

**Option A — Direct dependency:** `@atlas/orchestration` imports `@langchain/langgraph`, defines compiled `StateGraph` objects, and runs them. Simple, no indirection.

**Option B — Port:** `@atlas/orchestration` defines graph node functions and topology descriptions. The LangGraph runtime is wrapped behind `OrchestrationPort` in `@atlas/infra/orchestration-langgraph`. Orchestration package does not import `@langchain/langgraph`.

## Decision

Use **Option B**: LangGraph is wrapped behind `OrchestrationPort`.

The graph *topology and node functions* live in `@atlas/orchestration` as pure TypeScript. The `LangGraphOrchestration` adapter in `@atlas/infra/orchestration-langgraph` compiles these definitions into LangGraph `StateGraph` instances and runs them.

## Consequences

**Positive:**
- `@atlas/orchestration` has no dependency on LangGraph. Graph node functions are pure functions that call ports — fully testable with fake adapters without the LangGraph runtime.
- If LangGraph's API changes (it has changed significantly between v0.1 and v0.2), the adaptation is localized to `@atlas/infra/orchestration-langgraph`.
- Graph node functions read as plain TypeScript, not LangGraph-specific DSL. Easier for contributors unfamiliar with LangGraph to understand.

**Negative:**
- More abstraction. The `OrchestrationPort.stream()` returns generic `GraphEvent` objects rather than the strongly-typed LangGraph streaming format. Some LangGraph-specific features (interrupt, send) require adaptation.
- `LangGraphOrchestration` must do non-trivial mapping: compile graph definitions, wire checkpointers, handle streaming. Not a trivial adapter.
- Debugging graph execution is harder when the LangGraph primitives are abstracted away.

**Neutral:**
- LangGraph's checkpointing is handled inside the adapter (using LangGraph's built-in Postgres checkpointer). Checkpointing is not visible to `@atlas/orchestration`.
- The `OrchestrationPort.resume()` method exists specifically because LangGraph supports human-in-the-loop interrupts; the port surface is designed for this use case even if the abstraction is imperfect.

## Alternatives considered

- **Option A (direct dependency):** Simpler, more idiomatic LangGraph usage. Rejected because it makes graph node functions dependent on the LangGraph runtime, complicating tests and entangling the business workflow with a specific AI orchestration library.
- **No LangGraph (custom state machine):** Build the orchestration layer ourselves. Rejected because LangGraph provides checkpointing, streaming, parallel execution, and human-in-the-loop for free. Re-implementing these would be significant scope with no differentiation value.
