import type { InquiryClaimRecord, InquiryPlaceRecord } from "@/features/inquiry";
import { Eyebrow, HAIRLINE_ROW, PANEL_GLASS } from "@/shared/ui";
import { cn } from "@atlas/ui";
import { X } from "lucide-react";

function ClaimRow({ claim }: { claim: InquiryClaimRecord }) {
  return (
    <li className={cn(HAIRLINE_ROW, "py-2.5")}>
      <a
        href={claim.sourceUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="text-[12.5px] leading-relaxed text-card-foreground hover:underline"
      >
        {claim.text}
      </a>
      <p className="mt-1.5 flex items-baseline gap-1.5 font-mono text-[10.5px] text-faint empty:hidden">
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
    <div
      className={cn(
        PANEL_GLASS,
        "pointer-events-auto absolute left-6 top-6 z-10 flex max-h-[calc(100%-6rem)] w-76 flex-col overflow-hidden",
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border-strong px-4 py-3.5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Eyebrow variant="meta">
            {place.claimCount} {place.claimCount === 1 ? "claim" : "claims"}
          </Eyebrow>
          <span className="truncate text-[15px] font-semibold leading-snug tracking-[-0.02em] text-card-foreground">
            {place.place}
          </span>
          {place.country && place.country !== place.place ? (
            <span className="truncate text-[11.5px] text-faint">{place.country}</span>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Close place claims"
          onClick={onClose}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-coverage/[0.14] hover:text-foreground"
        >
          <X aria-hidden="true" className="h-3 w-3" />
        </button>
      </div>

      <ul className="min-h-0 overflow-y-auto px-4 py-1">
        {place.claims.map((claim) => (
          <ClaimRow key={`${claim.sourceUrl}:${claim.text}`} claim={claim} />
        ))}
      </ul>
    </div>
  );
}
