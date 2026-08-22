import { Eyebrow } from "@/shared/ui";
import { formatRelativeTime } from "@/shared/utils/index.ts";
import { Button, cn } from "@atlas/ui";
import { Link } from "react-router-dom";
import type {
  InquiryClaimRecord,
  InquiryPlaceRecord,
  InquiryRunRecord,
} from "../repositories/inquiry-repository.ts";
import { isPaintableRun } from "./paintable-run.ts";
import { RUN_STATUS_LABEL, runStatusClass } from "./run-status.ts";

const NO_SYNTHESIS = "No synthesis for this run.";
const NO_PLACES = "This run placed no claim on the map.";

const LOW_CONFIDENCE = 0.5;

function ClaimRow({ claim }: { claim: InquiryClaimRecord }) {
  return (
    <li className="border-t border-border py-1.5">
      <a
        href={claim.sourceUrl}
        target="_blank"
        rel="noreferrer noopener"
        className={cn(
          "hover:underline",
          claim.confidence < LOW_CONFIDENCE ? "text-muted-foreground" : "text-card-foreground",
        )}
      >
        {claim.text}
      </a>
      <span className="ml-2 font-mono text-[10.5px] text-muted-foreground tabular-nums">
        {claim.confidence.toFixed(2)}
        {claim.publishedDate ? ` · ${claim.publishedDate.slice(0, 10)}` : null}
      </span>
    </li>
  );
}

function PlaceBlock({ place }: { place: InquiryPlaceRecord }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12.5px] font-semibold text-card-foreground">
          {place.place}
          {place.country ? (
            <span className="font-normal text-muted-foreground"> · {place.country}</span>
          ) : null}
        </span>
        <span className="font-mono text-[10.5px] text-muted-foreground tabular-nums">
          {place.claimCount} claims
        </span>
      </div>
      <ul className="text-[12px] leading-relaxed">
        {place.claims.map((claim) => (
          <ClaimRow key={`${claim.sourceUrl}:${claim.text}`} claim={claim} />
        ))}
      </ul>
    </div>
  );
}

function Places({ places }: { places: InquiryPlaceRecord[] }) {
  if (places.length === 0) {
    return <p className="text-[12px] text-muted-foreground">{NO_PLACES}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {places.map((place) => (
        <PlaceBlock key={`${place.place}:${place.country ?? ""}`} place={place} />
      ))}
    </div>
  );
}

export function RunDetail({ run }: { run: InquiryRunRecord }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Eyebrow>Run · {run.window} window</Eyebrow>
          <h2 className="text-[15px] font-semibold leading-snug text-card-foreground">
            {run.question}
          </h2>
          <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-muted-foreground">
            {formatRelativeTime(run.createdAt)}
            <span className={runStatusClass(run.status)}>· {RUN_STATUS_LABEL[run.status]}</span>
          </span>
        </div>

        {isPaintableRun(run.places.length) ? (
          <Button asChild size="sm" variant="secondary">
            <Link to={`/world?run=${encodeURIComponent(run.id)}`}>Show on map</Link>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Eyebrow>Synthesis</Eyebrow>
        <p className="text-[12.5px] leading-relaxed text-card-foreground">
          {run.synthesis ?? <span className="text-muted-foreground">{NO_SYNTHESIS}</span>}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <Eyebrow>Claims by place</Eyebrow>
          <span className="font-mono text-[10.5px] text-muted-foreground tabular-nums">
            {run.claimCount} claims
            {run.unplacedClaims > 0 ? ` · ${run.unplacedClaims} unplaced` : null}
          </span>
        </div>
        <Places places={run.places} />
      </div>
    </div>
  );
}
