# ADR 0001 — Use Bun as Runtime and Package Manager

**Status:** Accepted  
**Date:** 2026-05-06

## Context

The project needs a JavaScript/TypeScript runtime for the API server and background worker, and a package manager for the Nx monorepo. Options considered: Node.js + npm/yarn/pnpm, Deno, Bun.

The project is a portfolio project that may become a product. Developer experience and startup performance matter.

## Decision

Use **Bun** as both the runtime (`apps/api`, `apps/worker`) and the package manager (workspace root `bun install`). The frontend (`apps/web`) uses Rsbuild for building and is served statically — Bun is not the bundler for React.

## Consequences

**Positive:**
- Native TypeScript execution without a transpile step in development — `bun --watch src/main.ts` just works.
- Significantly faster `bun install` vs npm/yarn/pnpm (relevant for CI).
- Bun's test runner is built-in (no separate install needed for M1 tests).
- Fast startup time — important for the worker process.

**Negative:**
- Some Node.js native addons don't work under Bun. tree-sitter native bindings may be affected (see Risk R3 in `docs/08-risks.md`). Mitigation: validate early in M1.
- Bun is not yet 1:1 compatible with Node.js API surface. Edge cases may appear when adding new packages.
- Less mature ecosystem tooling around Bun vs Node.js (fewer tutorials, less Stack Overflow coverage).

**Neutral:**
- Fastify is Bun-compatible and well-maintained.
- LangChain/LangGraph are pure ESM packages that run identically under Node and Bun.

## Alternatives considered

- **Node.js + pnpm**: more battle-tested, but slower DX (transpile step needed for TypeScript). Rejected in favour of faster iteration.
- **Deno**: compelling runtime with native TypeScript, but LangChain ecosystem compatibility is weaker and Nx workspace support is limited.
