# Product

## Three modules, one data layer

All three modules share the same ingested Polymarket data (markets, events, outcomes, price ticks, trades) and the same AI infrastructure (LangGraph, Anthropic LLM, pgvector). Modules differ only in which LangGraph graph they trigger and what surface they render.

---

## Module A — Market Intelligence (ships first)

**Entry point:** Market detail page or event page → "Run Analysis" button.

**What it does:** A LangGraph intelligence graph runs on demand for a single market or event. It fetches price history, related markets within the same event, and recent top trades in parallel, then synthesizes a narrative report.

**Report contains:**
- **What happened:** timeline of significant price moves correlated with timestamps
- **Current state:** where outcomes stand and why
- **Key signals to watch:** factors that will move the price (upcoming dates, decisions, data releases)
- **Related markets:** how correlated markets are pricing the same underlying event

**UI surfaces:**
- `/` — Dashboard: filterable/sortable market list (by category, volume, 24h move, status)
- `/events/:id` — Event page: all markets within an event, group summary
- `/markets/:id` — Market detail: price chart, outcomes table, Analysis panel (stream via SSE), recent trades, related markets
- `/watchlist` — Saved markets with at-a-glance price + 24h move

---

## Module B — Edge Finder (M3)

**Entry point:** `/edges` page, refreshed on a schedule.

**What it does:** A LangGraph edge graph scans active markets above a volume threshold. For each, it fetches context and asks the LLM to estimate a fair value given available information. Markets where fair value diverges meaningfully from market price are ranked and surfaced.

**Output per item:**
- Market title + current odds
- AI fair-value estimate per outcome
- Edge percentage (estimated gap)
- One-paragraph AI rationale

**Important caveat (shown in UI):** Fair-value estimates are AI reasoning over incomplete information, not financial advice. They surface for research; users make their own decisions.

---

## Module C — Discrepancy Detector (M4)

**Entry point:** `/discrepancies` page, runs per-event on a schedule.

**What it does:** For a given event (e.g., "2024 US Election"), Atlas loads all related markets and checks whether their implied probabilities are mutually consistent. Example: if "Trump wins" is at 55%, but the sum of Trump's state market prices implies 62%, that's a 7-point discrepancy worth investigating.

**Output per item:**
- Markets involved
- Numerical inconsistency with explanation
- AI-generated hypothesis for why the discrepancy exists
- Magnitude score for ranking

---

## Cross-data enrichment (future milestones)

The three modules work with Polymarket data alone in MVP. In later milestones, additional context ports plug into the same graphs:

| Port | Adds to graphs | Milestone |
|---|---|---|
| `NewsPort` | Recent news relevant to the market; correlated with price moves | M5 |
| `OnChainPort` | Top-trader flows; wallet concentration; smart-money positioning | M6 |
| Sentiment API | Social signal (X, Reddit) | TBD |

Each is an additional parallel branch in the relevant graph. Because these are ports, they plug in without restructuring the graph topology.

---

## What Atlas is NOT

- **Not a trading platform.** No order placement, no wallet integration, no portfolio tracking of real positions.
- **Not financial advice.** Edge estimates are AI reasoning for research purposes; they are prominently disclaimed.
- **Not real-time.** Data is ingested on a schedule (default: every 5 minutes for active markets). Not a live orderbook.
- **Not exhaustive.** Analysis runs on demand; Atlas does not pre-analyze every market.

---

## MVP scope (M0 → M2)

- Module A only
- Polymarket data only (Gamma API for markets/events, CLOB API for trades/prices)
- No auth (single-user, local)
- No cross-data enrichment
- Dashboard + market detail + watchlist (localStorage-backed for MVP)
