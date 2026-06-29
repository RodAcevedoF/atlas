import { TopBar } from "./components/dashboard/top-bar.tsx";
import { MapCockpit } from "./components/world-map/map-cockpit.tsx";
import { usePanelVisibility } from "./components/world-map/use-panel-visibility.ts";
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
  const { visibility, anyVisible, toggleAll, hidePanel, togglePanel } = usePanelVisibility();

  const markets = dashboard?.markets ?? [];
  const worldTopics = dashboard?.worldTopics ?? [];
  const signalsIngested = worldTopics.reduce((sum, region) => sum + region.signalCount, 0);

  return (
    <main className="flex h-screen flex-col gap-3.25 overflow-hidden px-4 pb-4 pt-3.75">
      <TopBar
        source={source}
        onSourceChange={setSource}
        onSyncMarkets={() => void handleSync()}
        onSyncNews={() => void handleSyncNews()}
        isSyncing={isSyncing}
        isSyncingNews={isSyncingNews}
        panelVisibility={visibility}
        anyPanelVisible={anyVisible}
        onToggleAllPanels={toggleAll}
        onTogglePanel={togglePanel}
      />

      {error ? (
        <div className="flex-none rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-[12.5px] text-destructive-foreground">
          {error}
        </div>
      ) : null}

      <MapCockpit
        worldTopics={worldTopics}
        markets={markets}
        activeMarketCount={dashboard?.activeMarketCount ?? 0}
        totalVolumeUsd={dashboard?.totalVolumeUsd ?? 0}
        totalLiquidityUsd={dashboard?.totalLiquidityUsd ?? 0}
        signalsIngested={signalsIngested}
        isLoading={isLoading}
        category={category}
        status={status}
        onCategoryChange={setCategory}
        onStatusChange={setStatus}
        visibility={visibility}
        onHidePanel={hidePanel}
      />
    </main>
  );
}
