import { useRecentInquiryRuns } from "@/features/inquiry/hooks/use-recent-inquiry-runs.ts";
import { useMemo } from "react";
import { TopBar } from "./components/dashboard/top-bar.tsx";
import { MapCockpit } from "./components/world-map/map-cockpit.tsx";
import type { MapStatsValues } from "./components/world-map/overlays/map-stats.tsx";
import { useMarketDashboard } from "./hooks/use-market-dashboard.ts";

const EMPTY_STATS: MapStatsValues = { signals: 0, regions: 0, topics: 0 };

export function WorldAwarenessPage() {
  const { topic, setTopic, dashboard, isSyncing, error, handleSync } = useMarketDashboard();
  const { runs: inquiryRuns, error: inquiryError } = useRecentInquiryRuns();
  const mapError = error ?? inquiryError;

  const { markets, worldTopics, worldEvents } = useMemo(
    () => ({
      markets: dashboard?.markets ?? [],
      worldTopics: dashboard?.worldTopics ?? [],
      worldEvents: dashboard?.worldEvents ?? [],
    }),
    [dashboard],
  );

  const stats = useMemo<MapStatsValues>(
    () =>
      dashboard
        ? {
            signals: dashboard.worldSignals,
            regions: dashboard.regionsInFocus,
            topics: dashboard.activeTopics,
          }
        : EMPTY_STATS,
    [dashboard],
  );

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <TopBar onSync={() => void handleSync()} isSyncing={isSyncing} />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <MapCockpit
          worldTopics={worldTopics}
          worldEvents={worldEvents}
          markets={markets}
          topic={topic}
          onTopicChange={setTopic}
          stats={stats}
          inquiryRuns={inquiryRuns}
          error={mapError}
        />
      </div>
    </main>
  );
}
