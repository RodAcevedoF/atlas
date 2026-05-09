# Conventions

## File naming

- TypeScript source: `kebab-case.ts` / `kebab-case.tsx`
- Directories: `kebab-case`
- Exports: named exports everywhere; no default exports (makes refactoring easier)
- Port interface files: named after the port (`llm.ts`, `git.ts`, etc.)
- Adapter files: `index.ts` at the package root (one adapter per package)

## TypeScript

- Strict mode always. No `any`. No `!` non-null assertions except where absolutely necessary and commented.
- `verbatimModuleSyntax` is on. Use `import type` for type-only imports.
- Branded types for IDs (`RepoId`, `ModuleId`) — prevents passing the wrong ID to the wrong function at compile time.
- Prefer interfaces over type aliases for shapes that will be implemented (`interface LLMPort` rather than `type LLMPort`).
- Prefer type aliases for unions, primitives, and mapped types.

## Error handling

Two error classes in `@atlas/shared`:
- `AtlasError` — expected application errors (invalid input, not found, etc.). Has a `code` field for programmatic handling.
- `NotImplementedError` — adapter stubs. Should never reach production.

Convention:
- Use cases throw `AtlasError` for expected failures.
- Adapters throw native errors from their SDK (Fastify, Drizzle, etc.) plus wrapping into `AtlasError` at the boundary where appropriate.
- Never throw generic `Error` from use cases — always use `AtlasError` with a meaningful `code`.
- The Fastify error handler (in `apps/api`) maps `AtlasError` codes to HTTP status codes. Don't put HTTP logic in use cases.

## Logging

- `apps/api`: use Fastify's built-in pino logger (`req.log`, `app.log`). Never `console.log` in the API.
- `apps/worker`: use `console.log`/`console.error` with structured JSON (good enough until we wire pino).
- Packages (`domain`, `application`, `infrastructure/*`): no logging. Adapters may log internally to a logger they receive via constructor injection. Ports do not accept loggers.

## Testing approach

Tests live in `*.test.ts` files co-located with the code they test.

**Use-case tests** are the most important. Write them in `packages/application/src/use-cases/*.test.ts`. Use fake adapters (hand-written objects implementing the port interfaces) — no real DB, no real LLM. This is the main value of ports & adapters: use cases are fully testable with zero infrastructure.

**Adapter tests** validate that the real adapter behaves correctly. These are integration tests and require the actual technology (Postgres, ripgrep binary, etc.). They live in each infra package.

**No mocking frameworks.** Fake adapters are just objects implementing the interface. If a test needs a different behavior, write a different fake. Keep fakes in a `test/fakes/` directory in the package that uses them.

**Test runner:** Bun built-in (`bun test`). Decision to be confirmed in M1 when first tests are written.

## Adding a new feature (checklist)

1. Update the relevant doc in `docs/` (product, data model, or LangGraph design)
2. Add or update the domain entity if the feature introduces new data
3. Define the port interface if the feature needs a new external capability
4. Write the use-case interface in `application/src/use-cases/`
5. Write a test for the use case against fake adapters
6. Implement the use case (the implementation class will land in `application` too)
7. Implement the adapter stub, then the real adapter
8. Wire it in the composition root (`apps/api/src/main.ts` or `apps/worker/src/main.ts`)
9. Add the API route and/or UI component last

## Biome rules

Single `biome.json` at workspace root. No per-package overrides unless there's a specific reason. Running `bun lint:fix` auto-fixes most issues. CI runs `bun lint` (check-only, no write).
