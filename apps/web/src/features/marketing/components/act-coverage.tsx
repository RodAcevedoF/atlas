import { Reveal } from "@/shared/editorial/reveal.tsx";
import { useInView } from "@/shared/editorial/use-in-view.ts";
import { useRef } from "react";
import { ATTENTION_SHARES } from "../data/landing-content.ts";

/** Act one — coverage: on a parchment surface, attention normalised into a number. */
export function ActCoverage() {
  const barsRef = useRef<HTMLDivElement>(null);
  const inView = useInView(barsRef);

  return (
    <section id="act-coverage" className="relative overflow-hidden bg-paper text-paper-ink">
      <div
        aria-hidden="true"
        style={{ WebkitTextStroke: "1px color-mix(in srgb, var(--paper-ink) 9%, transparent)" }}
        className="pointer-events-none absolute -bottom-16 -right-4 font-serif text-[210px] leading-none text-transparent"
      >
        01
      </div>
      <div className="relative grid gap-16 px-10 pb- pt-16 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <div className="font-mono text-[8.5px] uppercase tracking-[0.24em] text-paper-coverage">
            Act one — coverage
          </div>
          <Reveal>
            <h2 className="mt-4.5 max-w-[20ch] font-serif text-[clamp(32px,4.2vw,62px)] leading-[1.03] tracking-[-0.01em]">
              What the world is looking at.
            </h2>
          </Reveal>
          <p className="mt-5.5 max-w-[44ch] text-pretty text-[16px] leading-[1.68] text-paper-ink-muted">
            Every story is normalised — topic, region, tone, weight — so attention stops being a
            feeling and becomes a figure you can set beside a price.
          </p>
          <p className="mt-4.5 max-w-[44ch] text-pretty text-[16px] leading-[1.68] text-paper-ink-muted">
            Language models do the reading and the translating. They never do the guessing.
          </p>
        </div>

        <div ref={barsRef}>
          <div className="flex justify-between border-b border-paper-ink/35 pb-2.5 font-mono text-[8px] uppercase tracking-[0.2em] text-paper-faint">
            <span>Attention share</span>
            <span>last 24h</span>
          </div>
          {ATTENTION_SHARES.map((share, index) => (
            <div
              key={share.topic}
              className="grid grid-cols-[118px_1fr_40px] items-center gap-4 border-b border-paper-ink/[0.14] py-3.75"
            >
              <span className="text-[15px]">{share.topic}</span>
              <span className="h-2 bg-paper-ink/8">
                <span
                  className="block h-2 bg-paper-coverage transition-[width] duration-1100 ease-[cubic-bezier(.2,.7,.2,1)]"
                  style={{
                    width: inView ? `${share.value}%` : 0,
                    transitionDelay: `${index * 80}ms`,
                  }}
                />
              </span>
              <span className="text-right font-mono text-[11px] text-paper-ink-muted">
                {share.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
