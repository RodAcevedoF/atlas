import { TopBar } from "./components/dashboard/top-bar.tsx";
import { TopicRail } from "./components/dashboard/topic-rail.tsx";
import { MapCockpit } from "./components/world-map/map-cockpit.tsx";
import { usePanelVisibility } from "./components/world-map/use-panel-visibility.ts";
import { useMarketDashboard } from "./hooks/use-market-dashboard.ts";

export function WorldAwarenessPage() {
  const {
    source,
    setSource,
    topic,
    setTopic,
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
  const worldEvents = dashboard?.worldEvents ?? [];

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

      <TopicRail topic={topic} onTopicChange={setTopic} />

      {error ? (
        <div className="flex-none rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-[12.5px] text-destructive-foreground">
          {error}
        </div>
      ) : null}

      <MapCockpit
        worldTopics={worldTopics}
        worldEvents={worldEvents}
        markets={markets}
        topic={topic}
        totalVolumeUsd={dashboard?.totalVolumeUsd ?? 0}
        worldSignals={dashboard?.worldSignals ?? 0}
        activeTopics={dashboard?.activeTopics ?? 0}
        regionsInFocus={dashboard?.regionsInFocus ?? 0}
        isLoading={isLoading}
        visibility={visibility}
        onHidePanel={hidePanel}
      />
    </main>
  );
}
