import { TopicSnapshots } from "@/features/world-awareness/components/snapshots/topic-snapshots.tsx";
import type { ReportSaveControls } from "@/features/world-awareness/components/world-scan/world-scan-panel.tsx";
import { WorldScanPanel } from "@/features/world-awareness/components/world-scan/world-scan-panel.tsx";
import { useTopicSnapshots } from "@/features/world-awareness/hooks/use-topic-snapshots.ts";
import { useWorldScanHistory } from "@/features/world-awareness/hooks/use-world-scan-history.ts";
import { useWorldScan } from "@/features/world-awareness/hooks/use-world-scan.ts";
import type {
  GeoRegion,
  Topic,
} from "@/features/world-awareness/repositories/market-repository.ts";
import { AppNavTabs } from "@/shared/app-nav-tabs.tsx";
import { GEO_REGIONS, TOPICS } from "@atlas/domain";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { SavedReports } from "./components/saved-reports.tsx";
import { useSavedReports } from "./hooks/use-saved-reports.ts";

function toTopic(value: string | null): Topic | undefined {
  return value && (TOPICS as readonly string[]).includes(value) ? (value as Topic) : undefined;
}

function toRegion(value: string | null): GeoRegion | undefined {
  return value && (GEO_REGIONS as readonly string[]).includes(value)
    ? (value as GeoRegion)
    : undefined;
}

function Header() {
  return (
    <header className="flex h-11.5 flex-none items-center gap-3.5 px-4 pt-3.75">
      <div className="flex items-center gap-2.5">
        <img src="/atlas_emblem.svg" alt="Atlas" className="h-6.5 w-6.5" />
        <div className="flex flex-col leading-[1.05]">
          <span className="text-[15px] font-semibold tracking-[-0.02em]">Atlas</span>
          <span className="text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
            Intelligence
          </span>
        </div>
      </div>
      <div className="h-5.5 w-px bg-border" />
      <AppNavTabs />
    </header>
  );
}

export function IntelligencePage() {
  const [searchParams] = useSearchParams();
  const scope = useMemo(
    () => ({
      topic: toTopic(searchParams.get("topic")),
      region: toRegion(searchParams.get("region")),
    }),
    [searchParams],
  );

  const { snapshots, isLoading: snapshotsLoading } = useTopicSnapshots();
  const { report, isScanning, error: scanError, runScan } = useWorldScan();
  const {
    reports: history,
    isLoading: isHistoryLoading,
    error: historyError,
    load: loadHistory,
  } = useWorldScanHistory();
  const saved = useSavedReports();

  const didAutoRun = useRef(false);
  useEffect(() => {
    if (didAutoRun.current || (!scope.topic && !scope.region)) return;
    didAutoRun.current = true;
    void runScan(scope);
  }, [runScan, scope]);

  const runScoped = useCallback(() => void runScan(scope), [runScan, scope]);
  const loadScopedHistory = useCallback(
    () => void loadHistory({ topic: scope.topic, region: scope.region }),
    [loadHistory, scope],
  );

  const saveControls: ReportSaveControls = {
    isSaved: saved.isSaved,
    onToggle: (reportId) => void saved.toggle(reportId),
    pendingId: saved.pendingId,
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />

      <div className="flex-none px-4 pt-3.25">
        <TopicSnapshots snapshots={snapshots} isLoading={snapshotsLoading} />
      </div>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 px-4 pb-4 pt-3.25 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <WorldScanPanel
          report={report}
          isScanning={isScanning}
          error={scanError}
          onRun={runScoped}
          history={history}
          isHistoryLoading={isHistoryLoading}
          historyError={historyError}
          onLoadHistory={loadScopedHistory}
          saveControls={saveControls}
        />
        <SavedReports
          reports={saved.reports}
          isLoading={saved.isLoading}
          error={saved.error}
          onRemove={(reportId) => void saved.toggle(reportId)}
          pendingId={saved.pendingId}
        />
      </main>
    </div>
  );
}
