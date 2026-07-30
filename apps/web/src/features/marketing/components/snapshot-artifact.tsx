import { Reveal } from "@/shared/editorial/reveal.tsx";
import { Button, cn } from "@atlas/ui";
import { Link } from "react-router-dom";
import { SNAPSHOT, type SnapshotNote } from "../data/landing-content.ts";
import { formatGap } from "../lib/gap.ts";

const POINTS = [
  { numeral: "i", text: "Timestamped and immutable — quotable as printed." },
  { numeral: "ii", text: "Every claim carries its source and its market." },
  { numeral: "iii", text: "Gaps are ranked, not buried in a stream." },
] as const;

const NOTE_DOT: Record<SnapshotNote["tone"], string> = {
  coverage: "bg-paper-coverage",
  conviction: "bg-paper-conviction",
  gap: "bg-paper-gap",
};

function ScoreTile({
  label,
  value,
  className,
}: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("py-3.5", className)}>
      <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-paper-faint">
        {label}
      </div>
      <div className="mt-1.5 font-serif text-[30px] leading-none">{value}</div>
    </div>
  );
}

function SnapshotCard() {
  return (
    <div className="border border-paper-ink/30 bg-paper-2">
      <div className="flex justify-between border-b border-paper-ink/30 px-4.5 py-3.25 font-mono text-[8px] uppercase tracking-[0.2em] text-paper-faint">
        <span>{SNAPSHOT.scope}</span>
        <span>{SNAPSHOT.timestamp}</span>
      </div>
      <div className="px-5.5 pb-6 pt-6.5">
        <div className="max-w-[26ch] font-serif text-[30px] leading-[1.16]">
          {SNAPSHOT.headline}
        </div>

        <div className="mt-6.5 grid grid-cols-3 border-y border-paper-ink/30">
          <ScoreTile
            label="coverage"
            value={String(SNAPSHOT.coverage)}
            className="border-r border-paper-ink/[0.14] text-paper-coverage"
          />
          <ScoreTile
            label="conviction"
            value={String(SNAPSHOT.conviction)}
            className="border-r border-paper-ink/[0.14] pl-4 text-paper-conviction"
          />
          <ScoreTile label="gap" value={formatGap(SNAPSHOT.gap)} className="pl-4 text-paper-gap" />
        </div>

        <div className="mt-5.5 flex flex-col gap-2.75">
          {SNAPSHOT.notes.map((note) => (
            <div key={note.text} className="grid grid-cols-[8px_1fr] items-start gap-3">
              <span className={cn("mt-1.75 h-1.5 w-1.5", NOTE_DOT[note.tone])} />
              <span className="text-[14.5px] leading-[1.6] text-paper-ink-muted">{note.text}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-paper-ink/[0.14] pt-4 font-mono text-[8.5px] text-paper-faint">
          {SNAPSHOT.sources.map((source) => (
            <span key={source} className="border border-paper-ink/[0.22] px-2 py-1">
              {source}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The artifact section: what a printed snapshot looks like, on a parchment surface. */
export function SnapshotArtifact({ enterHref }: { enterHref: string }) {
  return (
    <section className="bg-paper px-10 pb-18 pt-16.5 text-paper-ink">
      <div className="grid items-start gap-16 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <div className="font-mono text-[8.5px] uppercase tracking-[0.24em] text-paper-faint">
            The artifact
          </div>
          <Reveal>
            <h2 className="mt-4.5 max-w-[16ch] font-serif text-[clamp(30px,3.8vw,56px)] leading-[1.04]">
              A snapshot, not a feed.
            </h2>
          </Reveal>
          <p className="mt-5.5 max-w-[40ch] text-pretty text-[16px] leading-[1.68] text-paper-ink-muted">
            Choose a topic, a region, an hour. Atlas prints one page you can cite — and every page
            keeps its own date, so the trend writes itself on your shelf.
          </p>
          <div className="mt-7 flex flex-col gap-3 text-[15px]">
            {POINTS.map((point) => (
              <div key={point.numeral} className="grid grid-cols-[26px_1fr] items-baseline gap-2">
                <span className="font-mono text-[9px] text-paper-faint">{point.numeral}</span>
                <span>{point.text}</span>
              </div>
            ))}
          </div>
          <Button
            asChild
            className="mt-8.5 rounded-none bg-paper-ink px-5.5 py-3.25 text-[9px] uppercase tracking-[0.16em] text-paper hover:bg-paper-conviction"
          >
            <Link to={enterHref}>Open today's snapshot</Link>
          </Button>
        </div>

        <SnapshotCard />
      </div>
    </section>
  );
}
