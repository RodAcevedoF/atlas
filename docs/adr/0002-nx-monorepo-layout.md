# ADR 0002 — Nx Monorepo Layout

**Status:** Accepted  
**Date:** 2026-05-06

## Context

Atlas has three applications (`web`, `api`, `worker`) and multiple shared libraries (`domain`, `application`, `orchestration`, `shared`, `ui`, nine infrastructure adapters). A monorepo is clearly the right structure. The question is which tool to use.

## Decision

Use **Nx** as the monorepo task orchestrator, with **Bun workspaces** as the package manager layer. Nx provides task caching, dependency graph visualization, and project tags for documenting the hexagonal layer structure.

The layout is:
```
apps/           (web, api, worker)
packages/       (domain, application, orchestration, shared, ui, infrastructure/*)
```

Nx generators are not used — packages are hand-written. Nx is used only for:
1. `bun nx run-many -t typecheck` — parallel typecheck across all packages
2. `bun nx graph` — visualize the dependency graph
3. `project.json` tags — document which hexagonal layer each package belongs to
4. Task caching — avoid re-running typecheck on unchanged packages

## Consequences

**Positive:**
- `bun nx graph` gives a visual dependency map that enforces comprehension of the hexagonal structure.
- Caching makes `bun nx run-many -t typecheck` fast on incremental changes.
- Tags on `project.json` serve as living documentation of layer membership.
- Bun workspaces handle `node_modules` hoisting; Nx handles task orchestration. Clean separation of concerns.

**Negative:**
- Nx adds complexity (learning curve, `nx.json`, `project.json` per package). For this project size it's overkill in pure orchestration terms.
- Without ESLint, the Nx `enforce-module-boundaries` rule is not mechanically enforced. Layer rules are enforced by convention and TypeScript circular-dep detection only.

**Neutral:**
- Hand-written `package.json` per package instead of Nx generators is slightly more work but gives full control and avoids generator lock-in.

## Alternatives considered

- **Turborepo**: similar task caching, less opinionated. Rejected because Nx's dependency graph visualization and tag system add value for documenting the hexagonal layers.
- **Single package (no monorepo)**: simpler initially. Rejected because the hexagonal layer boundaries need physical separation to be enforceable.
- **Nx with ESLint for boundary enforcement**: would enable the `enforce-module-boundaries` rule. Rejected for M0 because it adds ESLint as a second linter alongside Biome. Can be added later if convention-based enforcement proves insufficient.
