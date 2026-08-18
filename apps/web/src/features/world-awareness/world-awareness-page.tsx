import { useLatestResearchRun } from "@/features/research/hooks/use-latest-research-run.ts";
import { useMemo } from "react";
import { TopBar } from "./components/dashboard/top-bar.tsx";
import { MapCockpit } from "./components/world-map/map-cockpit.tsx";
import type { MapStatsValues } from "./components/world-map/overlays/map-stats.tsx";
import { useMarketDashboard } from "./hooks/use-market-dashboard.ts";

const EMPTY_STATS: MapStatsValues = { signals: 0, regions: 0, topics: 0 };

function MapError({ message }: { message: string }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-10 max-w-md -translate-x-1/2 rounded-xl border border-destructive/40 bg-card/86 px-4 py-2 text-center text-[12.5px] text-destructive backdrop-blur-md">
      {message}
    </div>
  );
}

export function WorldAwarenessPage() {
  const { topic, setTopic, dashboard, isSyncing, error, handleSync } = useMarketDashboard();
  const { run: researchRun, error: researchError } = useLatestResearchRun();
  const mapError = error ?? researchError;

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
          researchRun={researchRun}
        />
        {mapError ? <MapError message={mapError} /> : null}
      </div>
    </main>
  );
}
