import { useReducedMotion } from "@/shared/brand";
import { eyebrowVariants } from "@/shared/ui/index.ts";
import { cn } from "@atlas/ui";
import type { CSSProperties } from "react";
import { PLACE_ROWS, type PlaceRow } from "../../data/landing-content.ts";

const HEAD_CLASS = eyebrowVariants({ variant: "meta" });

interface PlaceView extends PlaceRow {
  share: number;
  delay: number;
}

function toPlaceView(row: PlaceRow, index: number, peak: number, motionless: boolean): PlaceView {
  return {
    ...row,
    share: peak > 0 ? Math.round((row.claims / peak) * 100) : 0,
    delay: motionless ? 0 : Number((0.1 + index * 0.09).toFixed(2)),
  };
}

export function PlaceTable() {
  const reducedMotion = useReducedMotion();
  const peak = PLACE_ROWS.reduce((max, row) => Math.max(max, row.claims), 0);
  const rows = PLACE_ROWS.map((row, index) => toPlaceView(row, index, peak, reducedMotion));

  return (
    <div className="w-full">
      <div
        className={cn("grid grid-cols-[1fr_46px] border-b border-border-strong pb-2.5", HEAD_CLASS)}
      >
        <span>place</span>
        <span className="text-right text-conviction">claims</span>
      </div>

      {rows.map((row) => (
        <div key={row.place} className="border-b border-border py-3.5">
          <div className="grid grid-cols-[1fr_46px] items-center gap-3">
            <span className="flex h-2 bg-foreground/[0.06]">
              <span
                className="atlas4-grow-x block h-2 bg-coverage"
                style={
                  {
                    width: `${row.share}%`,
                    "--grow-origin": "left",
                    "--grow-delay": `${row.delay}s`,
                  } as CSSProperties
                }
              />
            </span>
            <span className="text-right font-mono text-[11.5px] tabular-nums text-conviction">
              {row.claims}
            </span>
          </div>
          <div className="mt-2 text-[12.5px] text-foreground/60">
            {row.place} <span className="text-foreground/30">· {row.region}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
