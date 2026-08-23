import type { InquiryClaimRecord, InquiryPlaceRecord } from "@/features/inquiry";
import { Eyebrow } from "@/shared/ui";
import { X } from "lucide-react";

function ClaimRow({ claim }: { claim: InquiryClaimRecord }) {
  return (
    <li className="border-t border-border py-2 first:border-t-0 first:pt-0">
      <a
        href={claim.sourceUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="text-[12px] leading-relaxed text-card-foreground hover:underline"
      >
        {claim.text}
      </a>
      <p className="mt-1 flex items-baseline gap-1.5 font-mono text-[10.5px] text-muted-foreground empty:hidden">
        {claim.sourceTitle ? <span className="truncate">{claim.sourceTitle}</span> : null}
        {claim.publishedDate ? (
          <span className="shrink-0 tabular-nums">{claim.publishedDate.slice(0, 10)}</span>
        ) : null}
      </p>
    </li>
  );
}

interface PlaceClaimsPanelProps {
  place: InquiryPlaceRecord;
  onClose: () => void;
}

export function PlaceClaimsPanel({ place, onClose }: PlaceClaimsPanelProps) {
  return (
    <div className="pointer-events-auto absolute left-4 top-4 z-10 flex max-h-[calc(100%-5.5rem)] w-72 flex-col rounded-xl border border-border bg-card/86 backdrop-blur-md">
      <div className="flex items-start justify-between gap-2 p-2.5">
        <div className="flex min-w-0 flex-col gap-1">
          <Eyebrow>
            {place.claimCount} {place.claimCount === 1 ? "claim" : "claims"}
          </Eyebrow>
          <span className="truncate text-[12.5px] font-semibold leading-snug text-card-foreground">
            {place.place}
          </span>
          {place.country && place.country !== place.place ? (
            <span className="truncate text-[11px] text-muted-foreground">{place.country}</span>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Close place claims"
          onClick={onClose}
          className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X aria-hidden="true" className="h-3 w-3" />
        </button>
      </div>

      <div className="h-px w-full shrink-0 bg-border" />

      <ul className="min-h-0 overflow-y-auto p-2.5">
        {place.claims.map((claim) => (
          <ClaimRow key={`${claim.sourceUrl}:${claim.text}`} claim={claim} />
        ))}
      </ul>
    </div>
  );
}
