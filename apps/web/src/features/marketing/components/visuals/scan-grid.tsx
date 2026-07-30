import { cn } from "@atlas/ui";
import { SCAN_GRID } from "../../data/landing-content.ts";

interface ScanGridProps {
  scanCount: number;
  hotCells: number[];
}

const META_CLASS = "font-mono text-[10.5px] uppercase tracking-[0.14em]";

function cellFill(isHot: boolean, isLit: boolean): string {
  if (isHot) return "bg-conviction";
  return isLit ? "bg-coverage/30" : "bg-coverage/10";
}

export function ScanGrid({ scanCount, hotCells }: ScanGridProps) {
  const cells = Array.from({ length: SCAN_GRID.cells }, (_, index) => ({
    id: `cell-${index}`,
    isHot: hotCells.includes(index),
    isLit: index % 5 === 0,
  }));

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between">
        <span className={cn(META_CLASS, "text-faint")}>Live scan</span>
        <span className="font-mono text-[30px] tabular-nums tracking-[-0.02em]">
          {scanCount.toLocaleString()}
        </span>
      </div>

      <div
        className="mt-4 grid gap-1.25"
        style={{ gridTemplateColumns: `repeat(${SCAN_GRID.columns}, 1fr)` }}
      >
        {cells.map((cell) => (
          <div
            key={cell.id}
            className={cn("relative aspect-square rounded-[2px]", cellFill(cell.isHot, cell.isLit))}
          >
            {cell.isHot ? (
              <span className="atlas4-ping absolute inset-0 rounded-[2px] bg-conviction/55" />
            ) : null}
          </div>
        ))}
      </div>

      <div className={cn("mt-3.5 flex justify-between text-faint", META_CLASS)}>
        <span>194 regions</span>
        <span>9 topics</span>
        <span>refreshing</span>
      </div>
    </div>
  );
}
