import { CHIP_BASE, Eyebrow } from "@/shared/ui";
import { Card, cn } from "@atlas/ui";
import type { WorldScanReportRecord } from "../../repositories/market-repository.ts";

interface ScanCoverageCardProps {
  report: WorldScanReportRecord;
  className?: string;
}

function SourceChips({ sources }: { sources: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {sources.map((source) => (
        <span
          key={source}
          className={cn(
            CHIP_BASE,
            "rounded-md border border-border bg-card-2 px-2 py-1 text-muted-foreground",
          )}
          title={source}
        >
          {source}
        </span>
      ))}
    </div>
  );
}

export function ScanCoverageCard({ report, className }: ScanCoverageCardProps) {
  const { coverage, regionNotes } = report;

  return (
    <Card className={cn("flex flex-col gap-4 p-5", className)}>
      <div className="flex flex-col gap-2">
        <Eyebrow>Scan coverage</Eyebrow>
        <p className="text-[12.5px] leading-[1.5] text-muted-foreground">{coverage.note}</p>
      </div>

      {coverage.sourcesUsed.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Eyebrow>Sources</Eyebrow>
          <SourceChips sources={coverage.sourcesUsed} />
        </div>
      ) : null}

      {regionNotes.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Eyebrow>Regions in focus</Eyebrow>
          <div className="flex flex-col gap-1.5">
            {regionNotes.map((note) => (
              <p key={note.region} className="text-[12px] leading-snug">
                <span className="font-medium text-foreground">{note.region}</span>
                <span className="text-muted-foreground"> — {note.note}</span>
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {coverage.gaps.length > 0 ? (
        <div className="mt-auto flex flex-col gap-2 border-t border-border pt-3.5">
          <Eyebrow>Gaps</Eyebrow>
          <div className="flex flex-col gap-1">
            {coverage.gaps.map((gap) => (
              <p key={gap} className="text-[11.5px] leading-snug text-faint">
                {gap}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
