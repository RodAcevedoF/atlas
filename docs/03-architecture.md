# Architecture — Ports & Adapters

Atlas uses a **ports & adapters** architecture (also called hexagonal architecture, clean architecture). This doc explains the model, the concrete layout, and the most common mistakes to avoid.

## The dependency rule

Dependencies point **inward only**. There are four layers, and each may only import from layers closer to the center:

```
┌─────────────────────────────────────────────┐
│  Infrastructure  (adapters, frameworks, I/O) │
│  ┌─────────────────────────────────────────┐ │
│  │  Apps  (composition roots, inbound)      │ │
│  │  ┌───────────────────────────────────┐  │ │
│  │  │  Application  (use cases + ports) │  │ │
│  │  │  ┌─────────────────────────────┐ │  │ │
│  │  │  │       Domain  (entities)    │ │  │ │
│  │  │  └─────────────────────────────┘ │  │ │
│  │  └───────────────────────────────────┘  │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

- `domain` imports nothing except other `domain` code.
- `application` imports only `domain` and `shared`.
- `infrastructure/*` imports `application` (to implement ports) and `domain` (for entity types). Never imports other `infrastructure/*` packages.
- `apps/*` import `application` + the specific `infrastructure/*` adapters they need. This is the **composition root** — the only place where concrete adapters are wired to port interfaces.

Violating the dependency rule is a bug. If you find yourself importing from `infrastructure` inside `application`, stop and introduce a port instead.

## Packages and their layers

| Package | Layer | Can import from |
|---|---|---|
| `@atlas/domain` | Domain | nothing |
| `@atlas/shared` | Shared (cross-cutting) | nothing |
| `@atlas/application` | Application | `@atlas/domain`, `@atlas/shared` |
| `@atlas/orchestration` | Application | `@atlas/domain`, `@atlas/application`, `@atlas/shared` |
| `@atlas/infra/*` | Infrastructure | `@atlas/application`, `@atlas/domain`, `@atlas/shared` |
| `@atlas/ui` | UI (inbound adapter) | `@atlas/shared` |
| `apps/api` | Composition root | anything |
| `apps/web` | Composition root | anything |
| `apps/worker` | Composition root | anything |

## Ports (interfaces) vs Adapters (implementations)

A **port** is a TypeScript interface defined in `@atlas/application`. It describes what the application layer *needs* from the outside world, expressed in domain terms. Ports know nothing about databases, HTTP, or specific AI providers.

An **adapter** is a class in an `@atlas/infra/*` package that implements a port using a specific technology. Adapters know about Postgres, Anthropic SDK, tree-sitter, etc.

Example:
```ts
// Port — lives in @atlas/application/src/ports/llm.ts
export interface LLMPort {
  complete(messages: LLMMessage[], options?: LLMOptions): Promise<LLMCompletion>;
  stream(messages: LLMMessage[], options?: LLMOptions): AsyncIterable<string>;
}

// Adapter — lives in @atlas/infra/llm-anthropic/src/index.ts
import Anthropic from "@anthropic-ai/sdk";
export class AnthropicLLMAdapter implements LLMPort { ... }
```

The port is defined by what the application layer needs. The adapter is defined by what the technology provides. They meet at the interface.

## Adding a new port + adapter (checklist)

1. Add the interface to `packages/application/src/ports/<name>.ts`
2. Export it from `packages/application/src/index.ts`
3. Create `packages/infrastructure/<name>-<tech>/src/index.ts` with a stub class
4. Add the new infra package to `packages/infrastructure/<name>-<tech>/package.json`
5. Wire the concrete adapter into the composition root (`apps/api/src/main.ts` or `apps/worker/src/main.ts`)
6. Never import the adapter class from `application` or `orchestration`

## Common mistakes

- **Importing an adapter from application**: the whole point of ports is that application doesn't know which adapter is used. Use a port.
- **Putting business logic in an adapter**: adapters should translate between the port interface and the technology. Business rules go in use cases or domain entities.
- **Wiring adapters in a library package**: DI wiring belongs only in `apps/*`. Libraries export interfaces and implementations; they don't compose them.
- **One giant `infrastructure` package**: each adapter is its own package so it can be swapped independently. If `@atlas/infra/llm-anthropic` is replaced with `@atlas/infra/llm-openai`, nothing else changes.
