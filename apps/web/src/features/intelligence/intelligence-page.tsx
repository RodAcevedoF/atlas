import { AccountMenu } from "@/features/auth/components/account-menu.tsx";
import { TopicSnapshots } from "@/features/world-awareness/components/snapshots/topic-snapshots.tsx";
import {
  LeadDevelopment,
  SideDevelopment,
} from "@/features/world-awareness/components/world-scan/development-cards.tsx";
import { DivergencesCard } from "@/features/world-awareness/components/world-scan/divergences-card.tsx";
import type { ReportSaveControls } from "@/features/world-awareness/components/world-scan/past-reports.tsx";
import { PastReports } from "@/features/world-awareness/components/world-scan/past-reports.tsx";
import { scopeLabels } from "@/features/world-awareness/components/world-scan/report-body.tsx";
import { ScanCoverageCard } from "@/features/world-awareness/components/world-scan/scan-coverage-card.tsx";
import { ScanHero } from "@/features/world-awareness/components/world-scan/scan-hero.tsx";
import { ScanStatus } from "@/features/world-awareness/components/world-scan/scan-status.tsx";
import { useTopicSnapshots } from "@/features/world-awareness/hooks/use-topic-snapshots.ts";
import { useWorldScanHistory } from "@/features/world-awareness/hooks/use-world-scan-history.ts";
import { useWorldScan } from "@/features/world-awareness/hooks/use-world-scan.ts";
import type {
  GeoRegion,
  Topic,
} from "@/features/world-awareness/repositories/market-repository.ts";
import { AppHeader } from "@/shared/app-shell";
import { GEO_REGIONS, TOPICS } from "@atlas/domain";
import { Button } from "@atlas/ui";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { bentoLayout } from "./bento-layout.ts";
import { SavedReports } from "./components/saved-reports.tsx";
import { useSavedReports } from "./hooks/use-saved-reports.ts";

const SIDE_DEVELOPMENT_COUNT = 2;

function toTopic(value: string | null): Topic | undefined {
  return value && (TOPICS as readonly string[]).includes(value) ? (value as Topic) : undefined;
}

function toRegion(value: string | null): GeoRegion | undefined {
  return value && (GEO_REGIONS as readonly string[]).includes(value)
    ? (value as GeoRegion)
    : undefined;
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

  const runScoped = useCallback(() => void runScan(scope), [runScan, scope]);
  const loadScopedHistory = useCallback(
    () => void loadHistory({ topic: scope.topic, region: scope.region }),
    [loadHistory, scope],
  );

  // past scans live in mongo (newest first) => pull them on mount so the page hydrates
  useEffect(() => {
    loadScopedHistory();
  }, [loadScopedHistory]);

  const didAutoRun = useRef(false);
  useEffect(() => {
    if (didAutoRun.current || (!scope.topic && !scope.region)) return;
    didAutoRun.current = true;
    void runScan(scope);
  }, [runScan, scope]);

  const saveControls: ReportSaveControls = {
    isSaved: saved.isSaved,
    onToggle: (reportId) => void saved.toggle(reportId),
    pendingId: saved.pendingId,
  };

  const [leadDevelopment, ...restDevelopments] = report?.developments ?? [];
  const sideDevelopments = restDevelopments.slice(0, SIDE_DEVELOPMENT_COUNT);
  const scopeLabel = scopeLabels(scope).join(" · ");
  const hasLead = report !== null && report.developments.length > 0;
  const hasDivergences = report !== null && report.divergences.length > 0;
  const layout = bentoLayout({
    hasCoverage: report !== null,
    hasLead,
    hasDivergences,
    sideDevelopmentCount: sideDevelopments.length,
  });

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AppHeader
        subtitle="Intelligence"
        account={<AccountMenu />}
        actions={
          <Button
            onClick={runScoped}
            disabled={isScanning}
            className="h-8.5 px-3.75 text-[12.5px] font-semibold"
          >
            {isScanning ? "Scanning…" : "Run scan"}
          </Button>
        }
      />

      <main className="min-h-0 flex-1 overflow-y-auto">
        <TopicSnapshots snapshots={snapshots} isLoading={snapshotsLoading} />

        <div className="mx-auto grid w-full max-w-360 grid-cols-12 content-start gap-3.5 px-6 pb-16 pt-6">
          <ScanHero className={layout.hero} report={report} scopeLabel={scopeLabel} />

          {report ? <ScanCoverageCard className={layout.coverage} report={report} /> : null}

          <ScanStatus
            className="col-span-12"
            error={scanError}
            isScanning={isScanning}
            hasReport={report !== null}
          />

          {leadDevelopment ? (
            <LeadDevelopment className={layout.lead} development={leadDevelopment} />
          ) : null}

          {hasDivergences && report ? (
            <DivergencesCard className={layout.divergences} divergences={report.divergences} />
          ) : null}

          {sideDevelopments.map((development) => (
            <SideDevelopment
              key={`${development.where}-${development.title}`}
              className={layout.sideDevelopment}
              development={development}
            />
          ))}

          <SavedReports
            className={layout.savedReports}
            reports={saved.reports}
            isLoading={saved.isLoading}
            error={saved.error}
            onRemove={(reportId) => void saved.toggle(reportId)}
            pendingId={saved.pendingId}
          />

          <PastReports
            className={layout.pastReports}
            history={history}
            isLoading={isHistoryLoading}
            error={historyError}
            onLoad={loadScopedHistory}
            saveControls={saveControls}
          />
        </div>
      </main>
    </div>
  );
}
