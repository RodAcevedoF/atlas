import { cn } from "@atlas/ui";
import type { CSSProperties } from "react";
import type { WaveBar } from "./wave.ts";

type WaveVariant = "coverage" | "conviction";

interface WaveMeterProps {
  label: string;
  value: string | number;
  bars: WaveBar[];
  variant: WaveVariant;
  trackClassName?: string;
}

const VARIANT = {
  coverage: {
    fill: "atlas4-wave-coverage",
    track: "items-end border-b",
    label: "text-faint",
    value: "text-foreground/80",
  },
  conviction: {
    fill: "atlas4-wave-conviction",
    track: "items-start border-t",
    label: "text-conviction",
    value: "text-conviction",
  },
} as const;

export function WaveMeter({ label, value, bars, variant, trackClassName }: WaveMeterProps) {
  const styles = VARIANT[variant];

  return (
    <div>
      <div
        className={cn(
          "flex justify-between font-mono text-[11px] uppercase tracking-[0.14em]",
          styles.label,
        )}
      >
        <span>{label}</span>
        <span className={cn("tabular-nums", styles.value)}>{value}</span>
      </div>
      <div className={cn("mt-3 flex gap-[3px] border-border", styles.track, trackClassName)}>
        {bars.map((bar) => (
          <span
            key={bar.id}
            className={cn("flex-1", styles.fill, "atlas4-wave")}
            style={
              {
                height: `${bar.height}%`,
                "--wave-dur": `${bar.durationSec}s`,
                "--wave-delay": `${bar.delaySec}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
