import { Eyebrow } from "@/shared/ui";
import { formatRelativeTime } from "@/shared/utils/index.ts";
import { Card, cn } from "@atlas/ui";
import type { WorldScanReportRecord } from "../../repositories/market-repository.ts";

interface ScanHeroProps {
  report: WorldScanReportRecord | null;
  scopeLabel: string;
  className?: string;
}

function MetaStrip({
  report,
  scopeLabel,
}: {
  report: WorldScanReportRecord | null;
  scopeLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-x-6.5 gap-y-1.5 border-t border-border pt-4 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
      {report ? (
        <>
          <span>{report.header.newsSignalCount} news signals</span>
          <span>{report.header.marketMoverCount} market movers</span>
          <span className="text-faint">
            scanned {formatRelativeTime(report.header.generatedAt)}
          </span>
        </>
      ) : null}
      <span>{scopeLabel}</span>
    </div>
  );
}

export function ScanHero({ report, scopeLabel, className }: ScanHeroProps) {
  return (
    <Card
      className={cn("atlas-scan-hero flex min-h-53 flex-col justify-between gap-5 p-6", className)}
    >
      <div>
        <Eyebrow>World scan</Eyebrow>
        <h1 className="mt-2.25 text-[32px] font-semibold leading-[1.1] tracking-[-0.02em]">
          Attention vs. expectation
        </h1>
        <p className="mt-2.5 max-w-115 text-sm leading-[1.55] text-muted-foreground">
          Surface what changed and where the money disagrees with the headlines.
        </p>
      </div>
      <MetaStrip report={report} scopeLabel={scopeLabel} />
    </Card>
  );
}
