import { Reveal } from "@/shared/editorial/reveal.tsx";
import { useCountUp } from "@/shared/editorial/use-count-up.ts";
import { cn } from "@atlas/ui";
import { OPEN_POSITIONS, type OpenPosition } from "../data/landing-content.ts";

function OpenPositionRow({ position }: { position: OpenPosition }) {
  const odds = useCountUp(position.odds);
  const isUp = position.delta >= 0;

  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-5 border-b border-border py-4.5">
      <span className="text-[15.5px] text-foreground/90">{position.label}</span>
      <span className="font-serif text-[26px] text-conviction">
        {odds}
        <span className="text-[14px]">%</span>
      </span>
      <span
        className={cn(
          "w-11 text-right font-mono text-[10px]",
          isUp ? "text-positive" : "text-negative",
        )}
      >
        {isUp ? "+" : "−"}
        {Math.abs(position.delta)}
      </span>
    </div>
  );
}

/** Act two — conviction: prediction markets as the crowd's standing forecast. */
export function ActConviction() {
  return (
    <section id="act-conviction" className="relative overflow-hidden border-b border-border">
      <div
        aria-hidden="true"
        style={{ WebkitTextStroke: "1px color-mix(in srgb, var(--foreground) 11%, transparent)" }}
        className="pointer-events-none absolute -bottom-15.5 -left-4 font-serif text-[210px] leading-none text-transparent"
      >
        02
      </div>
      <div className="relative grid gap-16 px-10 pb-18 pt-17 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <div className="font-mono text-[8.5px] uppercase tracking-[0.24em] text-conviction">
            Act two — conviction
          </div>
          <Reveal>
            <h2 className="mt-4.5 max-w-[20ch] font-serif text-[clamp(32px,4.2vw,62px)] leading-[1.03]">
              What the world is <span className="italic">betting</span> on.
            </h2>
          </Reveal>
          <p className="mt-5.5 max-w-[44ch] text-pretty text-[16px] leading-[1.68] text-muted-foreground">
            A prediction market is a newsroom that has to pay for being wrong. Atlas reads its
            pricing as the crowd's standing forecast and keeps it beside the coverage, hour by hour.
          </p>
        </div>

        <div>
          <div className="flex justify-between border-b border-border-strong pb-2.5 font-mono text-[8px] uppercase tracking-[0.2em] text-faint">
            <span>Open positions</span>
            <span className="text-conviction">real money</span>
          </div>
          {OPEN_POSITIONS.map((position) => (
            <OpenPositionRow key={position.label} position={position} />
          ))}
        </div>
      </div>
    </section>
  );
}
