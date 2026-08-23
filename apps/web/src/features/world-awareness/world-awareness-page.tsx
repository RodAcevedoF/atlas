import { useRecentInquiryRuns } from "@/features/inquiry";
import { TopBar } from "./components/dashboard/top-bar.tsx";
import { MapCockpit } from "./components/world-map/map-cockpit.tsx";
import { useWorldDashboard } from "./hooks/use-world-dashboard.ts";

export function WorldAwarenessPage() {
  const { isSyncing, error, handleSync } = useWorldDashboard();
  const { runs: inquiryRuns, error: inquiryError } = useRecentInquiryRuns();

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <TopBar onSync={() => void handleSync()} isSyncing={isSyncing} />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <MapCockpit inquiryRuns={inquiryRuns} error={error ?? inquiryError} />
      </div>
    </main>
  );
}
