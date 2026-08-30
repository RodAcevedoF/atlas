import { cn } from "@atlas/ui";
import type { CSSProperties } from "react";
import { buildWave } from "./wave.ts";

const BARS = buildWave({ seed: 0.37, phase: 1.4, count: 24 });

interface EvidenceFlowProps {
  active?: boolean;
  className?: string;
}

export function EvidenceFlow({ active = false, className }: EvidenceFlowProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative h-16 overflow-hidden border-y border-border/70 bg-coverage/[0.025]",
        className,
      )}
    >
      {active ? (
        <span className="atlas4-scan atlas4-scan-line absolute left-0 top-0 z-1 h-px w-[34%]" />
      ) : null}

      <div className="absolute inset-x-0 bottom-0 flex h-[82%] items-end gap-0.75 px-1.5">
        {BARS.map((bar) => (
          <span
            key={bar.id}
            className={cn("atlas4-wave-coverage flex-1 opacity-65", active && "atlas4-wave")}
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

      <span className="absolute inset-x-0 bottom-0 h-px bg-coverage/35" />
      <span className="absolute bottom-0 right-[18%] h-1.5 w-1.5 translate-x-1/2 translate-y-1/2 rounded-full bg-conviction">
        {active ? (
          <span className="atlas4-ping absolute inset-0 rounded-full bg-conviction" />
        ) : null}
      </span>
    </div>
  );
}
