import { Reveal } from "@/shared/editorial/reveal.tsx";
import { useInView } from "@/shared/editorial/use-in-view.ts";
import { cn } from "@atlas/ui";
import { useRef } from "react";
import { GAP_ROWS } from "../data/landing-content.ts";
import { formatGap, gapToneClass } from "../lib/gap.ts";

const BAR_TRANSITION = "transition-[width] duration-[1200ms] ease-[cubic-bezier(.2,.7,.2,1)]";

export function ActTheGap() {
  const rowsRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rowsRef);

  return (
    <section id="act-the-gap" className="border-b border-border px-10 pb-19 pt-18">
      <div className="flex items-baseline justify-between gap-10">
        <div className="font-mono text-[8.5px] uppercase tracking-[0.24em] text-muted-foreground">
          Act three — the gap
        </div>
        <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-faint">
          ranked by divergence · 28 jul
        </div>
      </div>
      <Reveal>
        <h2 className="mt-5 max-w-[26ch] text-balance font-serif text-[clamp(34px,4.8vw,72px)] leading-[1.02]">
          Where the headlines and the money <span className="italic text-primary">disagree</span>,
          something is about to move.
        </h2>
      </Reveal>

      <div ref={rowsRef} className="mt-13 border-t border-border-strong">
        <div className="grid grid-cols-[1fr_88px_1fr] items-center border-b border-border py-2.5 font-mono text-[8px] uppercase tracking-[0.2em] text-faint">
          <span className="text-right text-coverage">← coverage</span>
          <span className="text-center">gap</span>
          <span className="text-conviction">conviction →</span>
        </div>
        {GAP_ROWS.map((row, index) => (
          <div
            key={row.label}
            className="grid grid-cols-[1fr_88px_1fr] items-center border-b border-border py-5"
          >
            <span className="flex items-center justify-end gap-4">
              <span className="text-[16px] text-foreground/90">{row.label}</span>
              <span className="flex h-2.5 w-[46%] justify-end bg-foreground/6">
                <span
                  className={cn("block h-2.5 bg-coverage", BAR_TRANSITION)}
                  style={{
                    width: inView ? `${row.coverage}%` : 0,
                    transitionDelay: `${index * 60}ms`,
                  }}
                />
              </span>
            </span>
            <span className={cn("text-center font-mono text-[11px]", gapToneClass(row.gap))}>
              {formatGap(row.gap)}
            </span>
            <span className="flex items-center gap-4">
              <span className="h-2.5 w-[46%] bg-foreground/6">
                <span
                  className={cn("block h-2.5 bg-conviction", BAR_TRANSITION)}
                  style={{
                    width: inView ? `${row.conviction}%` : 0,
                    transitionDelay: `${index * 60 + 100}ms`,
                  }}
                />
              </span>
              <span className="font-mono text-[10px] text-faint">{row.region}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
