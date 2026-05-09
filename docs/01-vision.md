# Vision

## The problem

Prediction markets are one of the most information-dense sources of real-time belief available. Polymarket alone processes millions of dollars daily across politics, crypto, sports, economics, and science. The market prices are, by construction, aggregated probability estimates from people with financial skin in the game — often more accurate than polls, pundits, or news commentary.

But the raw data is hard to use:
- The Polymarket interface is a trading UI, not a research tool. It shows current prices, not narratives.
- Price movements happen without explanation. Why did "Fed cuts rates in March" drop 20 points overnight?
- Related markets are not surfaced. A national election market and its 50 state sub-markets often imply inconsistent probabilities — nobody flags this.
- Cross-referencing with news, onchain flows, or social sentiment requires manually stitching together completely separate tools.

The result: the data is public and rich, but turning it into insight requires significant manual work.

## Our answer

Atlas is a read-only predictive analytics platform built on top of prediction-market data. It turns raw Polymarket data into structured intelligence via three AI-powered modules:

**Module A — Market Intelligence:** Ask Atlas to analyze a market or event. It pulls price history, related markets, and recent trade activity, runs a multi-step LangGraph analysis, and returns a narrative report: what happened, why the price moved, what signals to watch.

**Module B — Edge Finder:** Atlas periodically scans active markets, estimates fair value using AI reasoning over available context, and ranks markets by the gap between its estimate and the current market price. Output: a ranked feed of potential mispricings with rationale.

**Module C — Discrepancy Detector:** Atlas analyzes markets within the same event (e.g., all US election markets) and flags when their implied probabilities are numerically inconsistent. Arbitrageurs and analysts care deeply about this; it's currently a fully manual exercise.

All three modules share one data layer and one AI orchestration layer. Cross-data enrichment (news, onchain flows, social sentiment) plugs in as additional context in future milestones without reshaping the architecture.

## Target user

**Primary:** Prediction market participants (Polymarket, Kalshi, Manifold users) who want structured research rather than just a trading UI. They understand what odds mean and want to go deeper.

**Secondary:** Analysts, researchers, and journalists who use prediction markets as a real-time signal for broader reporting or research. They want the narrative and the data, not the trading features.

**Not targeting:** Casual news consumers unfamiliar with prediction markets. The product assumes market literacy.

## Why Polymarket first

Polymarket has the highest liquidity and most consistent REST API of any decentralized prediction market. Its Gamma API (markets, events, metadata) and CLOB API (orderbook, trades, prices) are both public and well-documented. All data is on-chain (Polygon), providing a secondary verification layer via The Graph subgraph.

The `MarketDataPort` interface is provider-agnostic by design. Kalshi (centralized, US-regulated), Manifold (play-money), and others can be added as separate adapters in later milestones without touching application logic. See [ADR 0006](./adr/0006-provider-agnostic-market-data-port.md).

## Why now

LangGraph enables stateful multi-step AI workflows with parallel branches and streaming output — exactly what's needed to run a "fetch price history + fetch related markets + fetch trades in parallel, then synthesize" analysis at query time. The orchestration complexity that made this hard six months ago is now straightforward. The Polymarket API is mature, public, and rate-limit-friendly for research use. The prediction market space has grown to the point where serious participants want research tooling.
