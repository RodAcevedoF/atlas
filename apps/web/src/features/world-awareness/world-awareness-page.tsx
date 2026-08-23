import { TopBar } from "./components/dashboard/top-bar.tsx";
import { MapCockpit } from "./components/world-map/map-cockpit.tsx";
import { useWorldAwareness } from "./hooks/use-world-awareness.ts";

export function WorldAwarenessPage() {
  const { awareness, error, canRefresh, isRefreshing, refreshRun, clearRequestedRun } =
    useWorldAwareness();

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <TopBar onRefresh={refreshRun} isRefreshing={isRefreshing} canRefresh={canRefresh} />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <MapCockpit awareness={awareness} error={error} onAsk={clearRequestedRun} />
      </div>
    </main>
  );
}
