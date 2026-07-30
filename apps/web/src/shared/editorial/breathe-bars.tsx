import { cn } from "@atlas/ui";
import { useMemo } from "react";
import { generateBreatheBars } from "./bars.ts";
import { useReducedMotion } from "./use-reduced-motion.ts";

interface BreatheBarsProps {
  /** number of bars to render across the row */
  count?: number;
  /** container classes — set the height and any opacity here */
  className?: string;
}

/** Row of coverage×conviction bars that "breathe" from the baseline. Decorative. */
export function BreatheBars({ count = 56, className }: BreatheBarsProps) {
  const reducedMotion = useReducedMotion();
  const bars = useMemo(() => generateBreatheBars(count), [count]);

  return (
    <div className={cn("flex items-end gap-0.5", className)} aria-hidden="true">
      {bars.map((bar) => (
        <div
          key={bar.id}
          className="flex-1 origin-bottom"
          style={{
            height: `${bar.heightPct}%`,
            background: bar.fill,
            animation: reducedMotion
              ? undefined
              : `atlas2-breathe ${bar.durationSec}s ease-in-out ${bar.delaySec}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
