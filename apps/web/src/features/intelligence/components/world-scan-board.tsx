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
import type { WorldScanInput } from "@/features/world-awareness/repositories/market-repository.ts";
import { useCallback, useEffect } from "react";
import { bentoLayout } from "../bento-layout.ts";
import { useSavedReports } from "../hooks/use-saved-reports.ts";
import { SavedReports } from "./saved-reports.tsx";

const SIDE_DEVELOPMENT_COUNT = 2;

export function WorldScanBoard({ scope }: { scope: WorldScanInput }) {
  const { snapshots, isLoading: snapshotsLoading } = useTopicSnapshots();
  const { report, isScanning, error: scanError } = useWorldScan();
  const {
    reports: history,
    isLoading: isHistoryLoading,
    error: historyError,
    load: loadHistory,
  } = useWorldScanHistory();
  const saved = useSavedReports();

  const loadScopedHistory = useCallback(
    () => void loadHistory({ topic: scope.topic, region: scope.region }),
    [loadHistory, scope],
  );

  useEffect(() => {
    loadScopedHistory();
  }, [loadScopedHistory]);

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
    <>
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
    </>
  );
}
