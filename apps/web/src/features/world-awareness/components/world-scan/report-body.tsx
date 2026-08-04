import { CHIP_BASE } from "@/shared/ui";
import { cn } from "@atlas/ui";
import type {
  WorldScanHistoryItem,
  WorldScanReportRecord,
} from "../../repositories/market-repository.ts";
import { REGION_LABELS, TOPIC_LABELS } from "../../utils/index.ts";

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{children}</div>
  );
}

const HTTP_REF = /^https?:\/\/[^/?#\s]+/;
const CITATION_CHIP = cn(CHIP_BASE, "rounded bg-muted px-1.5 py-0.5");

function refHost(ref: string): string {
  return new URL(ref).hostname.replace(/^www\./, "");
}

function Citation({ refValue }: { refValue: string }) {
  if (!HTTP_REF.test(refValue)) {
    return (
      <span className={cn(CITATION_CHIP, "text-muted-foreground")} title={refValue}>
        {refValue}
      </span>
    );
  }

  return (
    <a
      href={refValue}
      target="_blank"
      rel="noreferrer"
      className={cn(
        CITATION_CHIP,
        "text-coverage transition-colors hover:bg-secondary hover:text-primary hover:underline",
      )}
      title={refValue}
    >
      {refHost(refValue)}
    </a>
  );
}

export function Citations({ refs }: { refs: string[] }) {
  if (refs.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {refs.map((ref) => (
        <Citation key={ref} refValue={ref} />
      ))}
    </div>
  );
}

export function scopeLabels(scope: WorldScanHistoryItem["scope"]): string[] {
  const labels: string[] = [];
  if (scope.topic) labels.push(TOPIC_LABELS[scope.topic]);
  if (scope.region) labels.push(REGION_LABELS[scope.region]);
  return labels.length > 0 ? labels : ["All topics · all regions"];
}

export function ScopeChips({ scope }: { scope: WorldScanHistoryItem["scope"] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {scopeLabels(scope).map((chip) => (
        <span
          key={chip}
          className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

export function ReportBody({ report }: { report: WorldScanReportRecord }) {
  const { header, developments, divergences, regionNotes, coverage } = report;
  return (
    <div className="flex flex-col gap-4 py-3">
      <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
        <span>{header.newsSignalCount} news signals</span>
        <span aria-hidden="true">·</span>
        <span>{header.marketMoverCount} market movers</span>
        {header.topMovers.length > 0 ? (
          <span
            className="basis-full truncate text-foreground/70"
            title={header.topMovers.join(", ")}
          >
            movers: {header.topMovers.join(", ")}
          </span>
        ) : null}
      </div>

      {developments.length > 0 ? (
        <section className="flex flex-col gap-2.5">
          <SectionLabel>Developments</SectionLabel>
          {developments.map((development) => (
            <div key={development.title} className="flex flex-col gap-1">
              <div className="text-[13px] font-semibold leading-snug">{development.title}</div>
              <div className="text-[11px] text-muted-foreground">{development.where}</div>
              <p className="text-[12.5px] leading-snug text-foreground/90">
                {development.whyItMatters}
              </p>
              <Citations refs={development.citations} />
            </div>
          ))}
        </section>
      ) : null}

      {divergences.length > 0 ? (
        <section className="flex flex-col gap-2.5">
          <SectionLabel>Where the money disagrees</SectionLabel>
          {divergences.map((divergence) => (
            <div
              key={`${divergence.topic}-${divergence.region}`}
              className="flex flex-col gap-1 rounded-lg border border-border bg-muted/40 p-2.5"
            >
              <div className="text-[12px] font-semibold">
                {divergence.topic}
                <span className="ml-1.5 font-normal text-muted-foreground">
                  {divergence.region}
                </span>
              </div>
              <div className="text-[12px] leading-snug">
                <span className="text-muted-foreground">Attention: </span>
                {divergence.attention}
              </div>
              <div className="text-[12px] leading-snug">
                <span className="text-muted-foreground">Expectation: </span>
                {divergence.expectation}
              </div>
              <div className="text-[12px] leading-snug text-primary">{divergence.read}</div>
              <Citations refs={divergence.citations} />
            </div>
          ))}
        </section>
      ) : null}

      {regionNotes.length > 0 ? (
        <section className="flex flex-col gap-1.5">
          <SectionLabel>Regions in focus</SectionLabel>
          {regionNotes.map((note) => (
            <div key={note.region} className="text-[12px] leading-snug">
              <span className="font-medium">{note.region}</span>
              <span className="text-foreground/80"> — {note.note}</span>
            </div>
          ))}
        </section>
      ) : null}

      <section className="flex flex-col gap-1.5 border-t border-border pt-3">
        <SectionLabel>Coverage</SectionLabel>
        <p className="text-[11.5px] leading-snug text-muted-foreground">{coverage.note}</p>
        {coverage.sourcesUsed.length > 0 ? (
          <div className="text-[11px] text-muted-foreground">
            Sources: {coverage.sourcesUsed.join(", ")}
          </div>
        ) : null}
        {coverage.gaps.map((gap) => (
          <div key={gap} className="text-[11px] text-muted-foreground">
            · {gap}
          </div>
        ))}
      </section>
    </div>
  );
}
