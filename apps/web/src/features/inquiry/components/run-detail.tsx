import { CTA_SOLID, Eyebrow, HAIRLINE_ROW, eyebrowVariants } from "@/shared/ui";
import { formatRelativeTime } from "@/shared/utils/index.ts";
import { Button, cn } from "@atlas/ui";
import { Map as MapIcon } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import type {
  InquiryClaimRecord,
  InquiryPlaceRecord,
  InquiryRunRecord,
} from "../repositories/inquiry-repository.ts";
import { DeleteRunButton } from "./delete-run-button.tsx";
import { isPaintableRun } from "./paintable-run.ts";
import { RUN_STATUS_LABEL, isFailedRun, runStatusClass } from "./run-status.ts";

const NO_SYNTHESIS = "No synthesis for this run.";
const NO_PLACES = "This run placed no claim on the map.";
const NO_REASON = "No reason was recorded for this failure.";

const LOW_CONFIDENCE = 0.5;
const COST_DECIMALS = 3;

const SECTION_HEAD = "flex items-center justify-between gap-3";
const RULED_HEAD = cn(
  eyebrowVariants({ variant: "meta" }),
  SECTION_HEAD,
  "border-b border-border-strong pb-2.5",
);
const NUMERIC = "font-mono text-[11.5px] tabular-nums text-faint";
const STAT_LABEL = cn(eyebrowVariants({ variant: "header" }), "text-faint");
const STAT_VALUE = "mt-1.5 font-mono text-[23px] tabular-nums tracking-[-0.02em]";
const HEADLINE = "min-w-0 text-[26px] font-medium leading-[1.22] tracking-[-0.028em]";
const BODY = "text-[14.5px] leading-[1.62] text-card-foreground";

interface RunStat {
  label: string;
  value: number;
  isAccent: boolean;
}

function toRunStats(run: InquiryRunRecord): RunStat[] {
  return [
    { label: "claims", value: run.claimCount, isAccent: true },
    { label: "places", value: run.places.length, isAccent: false },
    { label: "unplaced", value: run.unplacedClaims, isAccent: false },
  ];
}

function StatGrid({ stats }: { stats: RunStat[] }) {
  return (
    <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[14px] bg-border">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-panel-cell px-3.5 py-3.5">
          <div className={STAT_LABEL}>{stat.label}</div>
          <div className={cn(STAT_VALUE, stat.isAccent ? "text-conviction" : null)}>
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function ClaimRow({ claim }: { claim: InquiryClaimRecord }) {
  return (
    <li className={cn(HAIRLINE_ROW, "py-2")}>
      <a
        href={claim.sourceUrl}
        target="_blank"
        rel="noreferrer noopener"
        className={cn(
          "text-[13.5px] leading-relaxed hover:underline",
          claim.confidence < LOW_CONFIDENCE ? "text-muted-foreground" : "text-card-foreground",
        )}
      >
        {claim.text}
      </a>
      <span className={cn(NUMERIC, "ml-2")}>
        {claim.confidence.toFixed(2)}
        {claim.publishedDate ? ` · ${claim.publishedDate.slice(0, 10)}` : null}
      </span>
    </li>
  );
}

function PlaceBlock({ place }: { place: InquiryPlaceRecord }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between gap-3 pb-1">
        <span className="text-[14px] font-semibold text-card-foreground">
          {place.place}
          {place.country ? (
            <span className="font-normal text-faint"> · {place.country}</span>
          ) : null}
        </span>
        <span className={cn(NUMERIC, "shrink-0 text-conviction")}>{place.claimCount} claims</span>
      </div>
      <ul className="flex flex-col">
        {place.claims.map((claim) => (
          <ClaimRow key={`${claim.sourceUrl}:${claim.text}`} claim={claim} />
        ))}
      </ul>
    </div>
  );
}

function FailureReason({ run }: { run: InquiryRunRecord }) {
  return (
    <section className="flex flex-col gap-2">
      <div className={SECTION_HEAD}>
        <Eyebrow variant="meta">why it failed</Eyebrow>
        <span className={NUMERIC}>
          {run.attempts} {run.attempts === 1 ? "attempt" : "attempts"}
        </span>
      </div>
      <p className={cn(BODY, "text-destructive")}>
        {run.error || <span className="text-muted-foreground">{NO_REASON}</span>}
      </p>
    </section>
  );
}

function RetrievalCost({ costUsd }: { costUsd: number }) {
  if (costUsd <= 0) {
    return null;
  }

  return <span className="tabular-nums">· retrieval ${costUsd.toFixed(COST_DECIMALS)}</span>;
}

function Places({ places }: { places: InquiryPlaceRecord[] }) {
  if (places.length === 0) {
    return <p className="text-[13.5px] text-muted-foreground">{NO_PLACES}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {places.map((place) => (
        <PlaceBlock key={`${place.place}:${place.country ?? ""}`} place={place} />
      ))}
    </div>
  );
}

function RunActions({ run, onDelete }: { run: InquiryRunRecord; onDelete: (() => void) | null }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {isPaintableRun(run.places.length) ? (
        <Button asChild variant={null} size="pillSm" className={CTA_SOLID}>
          <Link to={`/world?run=${encodeURIComponent(run.id)}`}>
            <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Show on map
          </Link>
        </Button>
      ) : null}
      {onDelete ? <DeleteRunButton key={run.id} onConfirm={onDelete} /> : null}
    </div>
  );
}

export function RunDetail({
  run,
  onDelete,
}: {
  run: InquiryRunRecord;
  onDelete: (() => void) | null;
}) {
  const stats = useMemo(() => toRunStats(run), [run]);

  return (
    <div className="atlas4-reveal flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className={SECTION_HEAD}>
          <Eyebrow variant="meta">run · {run.window} window</Eyebrow>
          <span className={NUMERIC}>{formatRelativeTime(run.createdAt)}</span>
        </div>

        <div className="flex items-start justify-between gap-5">
          <h2 className={HEADLINE}>{run.question}</h2>
          <RunActions run={run} onDelete={onDelete} />
        </div>

        <div className={cn(NUMERIC, "flex items-center gap-1.5")}>
          <span className={runStatusClass(run.status)}>{RUN_STATUS_LABEL[run.status]}</span>
          <RetrievalCost costUsd={run.retrievalCostUsd} />
        </div>
      </header>

      <StatGrid stats={stats} />

      {isFailedRun(run.status) ? <FailureReason run={run} /> : null}

      <section className="flex flex-col gap-2">
        <Eyebrow variant="meta">synthesis</Eyebrow>
        <p className={BODY}>
          {run.synthesis ?? <span className="text-muted-foreground">{NO_SYNTHESIS}</span>}
        </p>
      </section>

      <section className="flex flex-col gap-3.5">
        <div className={RULED_HEAD}>
          <span>claims by place</span>
          <span className="tabular-nums text-conviction">{run.claimCount} claims</span>
        </div>
        <Places places={run.places} />
      </section>
    </div>
  );
}
