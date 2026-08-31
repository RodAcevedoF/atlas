import { PANEL_GLASS } from "@/shared/ui";
import { cn } from "@atlas/ui";
import type { AnchoredMapPreview } from "../utils/map-preview.ts";

interface MapPreviewCardProps {
  anchored: AnchoredMapPreview;
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function MapPreviewCard({ anchored }: MapPreviewCardProps) {
  const { preview, x, y } = anchored;
  return (
    <div
      className={cn(
        PANEL_GLASS,
        "pointer-events-none absolute z-[1] min-w-32 -translate-x-1/2 -translate-y-[calc(100%+0.75rem)] px-3 py-2",
      )}
      style={{ left: x, top: y }}
    >
      {preview.kind === "cluster" ? (
        <p className="whitespace-nowrap font-mono text-[11px] text-card-foreground">
          {countLabel(preview.placeCount, "place", "places")} ·{" "}
          {countLabel(preview.claimCount, "claim", "claims")}
        </p>
      ) : (
        <div className="flex flex-col gap-0.5">
          <span className="whitespace-nowrap text-[12px] font-semibold text-card-foreground">
            {preview.place}
          </span>
          {preview.country && preview.country !== preview.place ? (
            <span className="whitespace-nowrap text-[10.5px] text-faint">{preview.country}</span>
          ) : null}
          <span className="whitespace-nowrap font-mono text-[10.5px] text-conviction">
            {countLabel(preview.claimCount, "claim", "claims")}
          </span>
        </div>
      )}
    </div>
  );
}
