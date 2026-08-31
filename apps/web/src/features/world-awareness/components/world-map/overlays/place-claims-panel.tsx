import type { InquiryClaimRecord, InquiryPlaceRecord } from "@/features/inquiry";
import { ClaimConfidence } from "@/features/inquiry";
import { Eyebrow, HAIRLINE_ROW, PANEL_GLASS } from "@/shared/ui";
import { isLowConfidenceClaim } from "@atlas/domain";
import { cn } from "@atlas/ui";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

function ClaimRow({ claim }: { claim: InquiryClaimRecord }) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const imageUrl =
    claim.sourceImageUrl && claim.sourceImageUrl !== failedImageUrl ? claim.sourceImageUrl : null;
  const isLowConfidence = isLowConfidenceClaim(claim);

  return (
    <li className={cn(HAIRLINE_ROW, "py-2.5")}>
      <div className="flex items-start gap-2.5">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            width={76}
            height={52}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailedImageUrl(imageUrl)}
            className="h-13 w-19 shrink-0 rounded-sm border border-border object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <a
            href={claim.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className={cn(
              "text-[12.5px] leading-relaxed hover:underline",
              isLowConfidence ? "text-muted-foreground" : "text-card-foreground",
            )}
          >
            {claim.text}
          </a>
          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-1 font-mono text-[10.5px] text-faint">
            {claim.sourceTitle ? (
              <span className="max-w-full truncate">{claim.sourceTitle}</span>
            ) : null}
            {claim.publishedDate ? (
              <span className="shrink-0 tabular-nums">{claim.publishedDate.slice(0, 10)}</span>
            ) : null}
            <ClaimConfidence claim={claim} className="tabular-nums" />
          </p>
        </div>
      </div>
    </li>
  );
}

interface PlaceClaimsPanelProps {
  place: InquiryPlaceRecord;
  onClose: () => void;
}

export function PlaceClaimsPanel({ place, onClose }: PlaceClaimsPanelProps) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      className={cn(
        PANEL_GLASS,
        "atlas4-reveal pointer-events-auto absolute left-6 top-6 z-10 flex max-h-[calc(100%-6rem)] w-76 flex-col overflow-hidden",
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
