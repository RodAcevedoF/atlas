import { BreatheBars } from "@/shared/editorial/breathe-bars.tsx";
import { Reveal } from "@/shared/editorial/reveal.tsx";
import { useCountUp } from "@/shared/editorial/use-count-up.ts";
import { cn } from "@atlas/ui";
import { IN_THIS_EDITION, STATS, type Tone } from "../data/landing-content.ts";

const TONE_TEXT: Record<Tone, string> = {
  coverage: "text-coverage",
  conviction: "text-conviction",
  foreground: "text-foreground",
};

export function HeroPremise() {
  const sources = useCountUp(STATS.sourcesCount);
  const regions = useCountUp(STATS.regionsCount);

  return (
    <section className="grid border-b border-border lg:grid-cols-[1.55fr_1fr]">
      <div className="border-b border-border px-10 pb-11 pt-13.5 lg:border-b-0 lg:border-r">
        <div className="font-mono text-[8.5px] uppercase tracking-[0.24em] text-faint">
          The premise
        </div>
        <Reveal>
          <h1 className="mt-5.5 max-w-[15ch] text-balance font-serif text-[clamp(38px,5.6vw,88px)] leading-none tracking-[-0.01em]">
            The world is read twice — once in the press,{" "}
            <span className="italic text-primary">once in the odds</span>.
          </h1>
        </Reveal>
        <Reveal delayMs={120}>
          <p className="mt-7.5 max-w-[52ch] text-pretty text-[16px] leading-[1.68] text-muted-foreground">
            Atlas holds global coverage and prediction-market pricing in one frame, then prints a
            snapshot: one dated, sourced read of any topic in any region. Where the two readings
            disagree is where the next story is.
          </p>
        </Reveal>
        <BreatheBars count={56} className="mt-11.5 h-33 border-b border-border-strong" />
        <div className="mt-2.25 flex justify-between font-mono text-[8px] uppercase tracking-[0.2em] text-faint">
          <span>72 hours of attention</span>
          <span>
            <span className="text-coverage">coverage</span> ·{" "}
            <span className="text-conviction">conviction</span>
          </span>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="border-b border-border px-8 pb-4 pt-5 font-mono text-[8.5px] uppercase tracking-[0.24em] text-faint">
          In this edition
        </div>
        {IN_THIS_EDITION.map((entry) => (
          <div
            key={entry.no}
            className="grid grid-cols-[46px_1fr] items-baseline gap-4 border-b border-border px-8 py-5.5"
          >
            <span className={cn("font-serif text-[30px]", TONE_TEXT[entry.tone])}>{entry.no}</span>
            <span>
              <span className="block font-serif text-[21px] text-foreground">{entry.title}</span>
              <span className="mt-1.5 block text-[13.5px] leading-relaxed text-muted-foreground">
                {entry.blurb}
              </span>
            </span>
          </div>
        ))}
        <div className="grid flex-1 grid-cols-2 border-t border-border">
          <div className="border-r border-border px-8 py-6">
            <div className="font-serif text-[38px] leading-none">{sources.toLocaleString()}</div>
            <div className="mt-2 font-mono text-[8px] uppercase tracking-[0.2em] text-faint">
              sources
            </div>
          </div>
          <div className="px-8 py-6">
            <div className="font-serif text-[38px] leading-none">{regions}</div>
            <div className="mt-2 font-mono text-[8px] uppercase tracking-[0.2em] text-faint">
              regions
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
