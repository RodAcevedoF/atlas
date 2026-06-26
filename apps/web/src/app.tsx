import { KpiStrip } from "./components/dashboard/kpi-strip.tsx";
import { MarketsTable } from "./components/dashboard/markets-table.tsx";
import { TopBar } from "./components/dashboard/top-bar.tsx";
import { TopTopics } from "./components/dashboard/top-topics.tsx";
import { WorldAttentionSection } from "./components/world-map/world-attention-section.tsx";
import { useMarketDashboard } from "./use-market-dashboard.ts";

export function App() {
  const {
    category,
    setCategory,
    status,
    setStatus,
    source,
    setSource,
    dashboard,
    isLoading,
    isSyncing,
    isSyncingNews,
    error,
    handleSync,
    handleSyncNews,
  } = useMarketDashboard();

  const markets = dashboard?.markets ?? [];
  const worldTopics = dashboard?.worldTopics ?? [];
  const signalsIngested = worldTopics.reduce((sum, region) => sum + region.signalCount, 0);

  return (
    <main className="flex h-screen flex-col gap-[13px] overflow-hidden px-4 pb-4 pt-[15px]">
      <TopBar
        source={source}
        onSourceChange={setSource}
        onSyncMarkets={() => void handleSync()}
        onSyncNews={() => void handleSyncNews()}
        isSyncing={isSyncing}
        isSyncingNews={isSyncingNews}
      />

      {error ? (
        <div className="flex-none rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-[12.5px] text-destructive-foreground">
          {error}
        </div>
      ) : null}

      <KpiStrip
        activeMarkets={dashboard?.activeMarketCount ?? 0}
        totalVolumeUsd={dashboard?.totalVolumeUsd ?? 0}
        totalLiquidityUsd={dashboard?.totalLiquidityUsd ?? 0}
        signalsIngested={signalsIngested}
        isLoading={isLoading}
      />

      <section className="flex min-h-0 flex-[1.32] gap-[13px]">
        <WorldAttentionSection breakdowns={worldTopics} />
      </section>

      <section className="flex min-h-0 flex-[0.92] gap-[13px]">
        <TopTopics breakdowns={worldTopics} />
        <MarketsTable
          markets={markets}
          category={category}
          status={status}
          onCategoryChange={setCategory}
          onStatusChange={setStatus}
          isLoading={isLoading}
        />
      </section>
    </main>
  );
}
