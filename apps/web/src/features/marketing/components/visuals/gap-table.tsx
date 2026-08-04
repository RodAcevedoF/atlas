import { useReducedMotion } from "@/shared/brand";
import { cn } from "@atlas/ui";
import type { CSSProperties } from "react";
import { GAP_ROWS, type GapRow } from "../../data/landing-content.ts";

const HEAD_CLASS = "font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint";
const BAR_TRACK = "flex h-2 bg-foreground/[0.06]";

interface GapView extends GapRow {
  gapLabel: string;
  gapClass: string;
  coverageDelay: number;
  convictionDelay: number;
}

function toGapView(row: GapRow, index: number, motionless: boolean): GapView {
  const gap = row.conviction - row.coverage;
  const gapClass =
    Math.abs(gap) < 10 ? "text-faint" : gap > 0 ? "text-conviction" : "text-gap-negative";
  return {
    ...row,
    gapLabel: `${gap > 0 ? "+" : "−"}${Math.abs(gap)}`,
    gapClass,
    coverageDelay: motionless ? 0 : Number((0.1 + index * 0.09).toFixed(2)),
    convictionDelay: motionless ? 0 : Number((0.16 + index * 0.09).toFixed(2)),
  };
}

export function GapTable() {
  const reducedMotion = useReducedMotion();
  const rows = GAP_ROWS.map((row, index) => toGapView(row, index, reducedMotion));

  return (
    <div className="w-full">
      <div
        className={cn(
          "grid grid-cols-[1fr_54px_1fr] border-b border-border-strong pb-2.5",
          HEAD_CLASS,
        )}
      >
        <span className="text-right">coverage</span>
        <span className="text-center">gap</span>
        <span className="text-conviction">conviction</span>
      </div>

      {rows.map((row) => (
        <div key={row.title} className="border-b border-border py-3.5">
          <div className="grid grid-cols-[1fr_54px_1fr] items-center">
            <span className={cn(BAR_TRACK, "justify-end")}>
              <span
                className="atlas4-grow-x block h-2 bg-coverage"
                style={
                  {
                    width: `${row.coverage}%`,
                    "--grow-origin": "right",
                    "--grow-delay": `${row.coverageDelay}s`,
                  } as CSSProperties
                }
              />
            </span>
            <span className={cn("text-center font-mono text-[11.5px] tabular-nums", row.gapClass)}>
              {row.gapLabel}
            </span>
            <span className={BAR_TRACK}>
              <span
                className="atlas4-grow-x block h-2 bg-conviction"
                style={
                  {
                    width: `${row.conviction}%`,
                    "--grow-origin": "left",
                    "--grow-delay": `${row.convictionDelay}s`,
                  } as CSSProperties
                }
              />
            </span>
          </div>
          <div className="mt-2 text-[12.5px] text-foreground/60">
            {row.title} <span className="text-foreground/30">· {row.region}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
