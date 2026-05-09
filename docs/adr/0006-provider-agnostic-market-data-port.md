# ADR 0006 — Provider-Agnostic MarketDataPort

**Status:** Accepted  
**Date:** 2026-05-06

## Context

Atlas is initially built on Polymarket data. Polymarket is the largest decentralized prediction market by volume and has a well-documented public REST API. However, the prediction-market space has multiple significant providers:

- **Kalshi** — centralized, CFTC-regulated, US-legal, REST API, growing rapidly
- **Manifold** — play-money markets, public API, good for low-stakes testing
- **Augur / Gnosis** — decentralized alternatives with on-chain data
- **PredictIt** — legacy US political markets

If the application layer imports Polymarket-specific API types directly, adding a second provider requires modifying application code. That violates the dependency rule.

## Decision

Define `MarketDataPort` as a provider-agnostic interface in `@atlas/application`. All application code and graph node functions depend on this interface. `PolymarketAdapter` in `@atlas/infra/market-polymarket` is the only implementation today.

The interface is defined in domain terms (`Market`, `Outcome`, `PriceTick`, `Trade`) — no Polymarket-specific concepts appear. Adapter-specific concerns (Polymarket's `conditionId` field, its distinction between gamma and CLOB APIs, its Polygon smart-contract addresses) are fully encapsulated inside `PolymarketAdapter`.

## Consequences

**Positive:**
- Adding Kalshi requires only a new `KalshiAdapter` package implementing `MarketDataPort`. Zero changes to application code, graphs, or use cases.
- The ingestion graph can run multiple adapters in parallel if the composition root wires more than one — multi-provider support with no graph changes.
- `PolymarketAdapter` can be tested independently against mock HTTP responses without involving any application logic.

**Negative:**
- The interface must be stable enough to represent all providers. If a future provider has a concept that doesn't fit (e.g., Kalshi's structured "series" vs Polymarket's "events"), we may need to extend the interface carefully. Premature abstraction risk.
- Adapters must map provider-specific IDs to Atlas domain IDs consistently. If Polymarket and Kalshi both have a "US Election Winner" market, they will have different `MarketId`s in Atlas. Cross-provider deduplication is a future problem.

**Neutral:**
- The `MarketFilter` and `PriceHistoryRange` types in the port are designed to be expressible against all major providers. They will be revised if a provider can't support a filter.

## Alternatives considered

- **Polymarket-specific types in application**: simpler today. Rejected because it makes adding a second provider a breaking change to application code.
- **Single adapter with a "provider" flag**: one adapter wraps all providers with an internal switch. Rejected because it violates the single-responsibility principle and makes each provider's code harder to test and maintain.
