import "./app.css";
import { GEO_REGIONS, MARKET_CATEGORIES, MARKET_STATUSES } from "@atlas/domain";
import type { GeoRegion, MarketCategory, MarketStatus } from "@atlas/domain";
import { Button } from "@atlas/ui";
import {
  formatCompactCurrency,
  formatDate,
  formatPercent,
  toTitleCase,
  topOutcomeLabel,
} from "./common/utils/index.ts";
import { useMarketDashboard } from "./use-market-dashboard.ts";

const CATEGORY_OPTIONS = MARKET_CATEGORIES.map((value) => ({
  value,
  label: toTitleCase(value),
}));

const STATUS_OPTIONS = MARKET_STATUSES.map((value) => ({
  value,
  label: toTitleCase(value),
}));

const REGION_LABELS: Record<GeoRegion, string> = {
  "north-america": "North America",
  "latin-america": "Latin America",
  europe: "Europe",
  "middle-east": "Middle East",
  africa: "Africa",
  asia: "Asia",
  oceania: "Oceania",
  global: "Global",
};

export function App() {
  const {
    category,
    setCategory,
    status,
    setStatus,
    dashboard,
    isLoading,
    isSyncing,
    error,
    syncMessage,
    handleSync,
  } = useMarketDashboard();

  const categorySummary = dashboard?.categorySummary.slice(0, 5) ?? [];
  const markets = dashboard?.markets ?? [];
  const events = dashboard?.events ?? [];
  const regions = dashboard?.regionSummary ?? [];
  const regionByKey = new Map(regions.map((entry) => [entry.region, entry]));

  return (
    <main className="appShell">
      <div className="dashboard">
        <section className="hero">
          <article className="panel">
            <div className="eyebrow">Atlas / Market Pulse MVP</div>
            <h1 className="heroTitle">See where prediction markets are concentrating attention.</h1>
            <p className="heroLead">
              This release gives you a read-side market pulse over stored Polymarket data: active
              questions, event clusters, category volume, and a clean path toward regional mapping.
            </p>

            <div className="heroActions">
              <Button
                className="rounded-full px-4"
                onClick={() => void handleSync()}
                disabled={isSyncing}
              >
                {isSyncing ? "Syncing snapshot..." : "Sync latest markets"}
              </Button>
              <div className="hint">
                {syncMessage ?? "Use the sync action to pull fresh Gamma markets into MongoDB."}
              </div>
            </div>

            <div className="filters">
              <select
                className="filterSelect"
                value={status}
                onChange={(event) => setStatus(event.target.value as MarketStatus | "")}
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                className="filterSelect"
                value={category}
                onChange={(event) => setCategory(event.target.value as MarketCategory | "")}
              >
                <option value="">All categories</option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </article>

          <aside className="heroAside">
            <article className="panel mapCard">
              <div className="sectionLabel">Region pulse</div>
              <p className="bodyCopy">
                Derived region tagging is now based on market and event text. This keeps the surface
                honest: it shows where market attention is aimed, not where traders physically are.
              </p>

              <div className="mapGrid">
                {GEO_REGIONS.map((region) => {
                  const entry = regionByKey.get(region);
                  return (
                    <div className="mapRegion" key={region}>
                      <div className="meta">
                        {entry ? `${entry.marketCount} markets` : "No data yet"}
                      </div>
                      <strong>{REGION_LABELS[region]}</strong>
                      <div className="muted">
                        {entry ? formatCompactCurrency(entry.totalVolumeUsd) : "Sync data"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          </aside>
        </section>

        {error ? <div className="errorBanner">{error}</div> : null}

        <section className="stats">
          <article className="panel">
            <div className="statLabel">Active markets</div>
            <div className="statValue">
              {isLoading ? "..." : (dashboard?.activeMarketCount ?? 0)}
            </div>
          </article>
          <article className="panel">
            <div className="statLabel">Tracked volume</div>
            <div className="statValue">
              {isLoading ? "..." : formatCompactCurrency(dashboard?.totalVolumeUsd ?? 0)}
            </div>
          </article>
          <article className="panel">
            <div className="statLabel">Tracked liquidity</div>
            <div className="statValue">
              {isLoading ? "..." : formatCompactCurrency(dashboard?.totalLiquidityUsd ?? 0)}
            </div>
          </article>
        </section>

        <section className="contentGrid">
          <article className="panel">
            <div className="sectionLabel">Markets</div>
            <p className="bodyCopy">
              Read-side view over stored markets. The dashboard stays useful even before the AI
              analysis modules land.
            </p>

            <div className="tableWrap">
              <table className="marketTable">
                <thead>
                  <tr>
                    <th>Market</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Top outcome</th>
                    <th>Volume</th>
                    <th>Resolves</th>
                  </tr>
                </thead>
                <tbody>
                  {markets.length > 0 ? (
                    markets.map((market) => (
                      <tr key={market.id}>
                        <td>
                          <p className="marketTitle">{market.title}</p>
                          <p className="marketDescription">
                            {market.description || "No description"}
                          </p>
                        </td>
                        <td>
                          <span className="chip">{market.category}</span>
                        </td>
                        <td>
                          <span className="badge" data-status={market.status}>
                            {market.status}
                          </span>
                        </td>
                        <td>{topOutcomeLabel(market)}</td>
                        <td>{formatCompactCurrency(market.volumeUsd)}</td>
                        <td>{formatDate(market.resolvesAt)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="muted">
                        {isLoading
                          ? "Loading markets..."
                          : "No markets stored yet. Use Sync latest markets to populate the dashboard."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <div className="stack">
            <article className="panel">
              <div className="sectionLabel">Category pulse</div>
              <div className="stack stackInset">
                {categorySummary.length > 0 ? (
                  categorySummary.map((entry) => (
                    <div className="summaryCard" key={entry.category}>
                      <div className="summaryRow">
                        <div>
                          <div className="meta">{entry.count} markets</div>
                          <h3 className="summaryTitle">{entry.category}</h3>
                        </div>
                        <strong>{formatCompactCurrency(entry.volumeUsd)}</strong>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="muted">No category summary yet.</div>
                )}
              </div>
            </article>

            <article className="panel">
              <div className="sectionLabel">Events</div>
              <div className="stack stackInset">
                {events.length > 0 ? (
                  events.map((event) => (
                    <article className="eventCard" key={event.id}>
                      <div className="badgeRow">
                        <span className="chip">{event.category}</span>
                        <span className="chip">{event.marketIds.length} linked markets</span>
                      </div>
                      <h3 className="eventTitle">{event.title}</h3>
                      <p className="bodyCopy">
                        {event.description || "No event description available."}
                      </p>
                    </article>
                  ))
                ) : (
                  <div className="muted">
                    {isLoading
                      ? "Loading events..."
                      : "No events stored yet. The sync action now persists events during ingestion."}
                  </div>
                )}
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
