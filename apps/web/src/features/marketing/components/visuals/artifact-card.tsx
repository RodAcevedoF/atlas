import { useTypewriter } from "@/shared/brand";
import { cn } from "@atlas/ui";
import { ARTIFACT } from "../../data/landing-content.ts";

const META_CLASS = "font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint";
const STAT_LABEL = "text-[9.5px] uppercase tracking-[0.14em] text-faint";
const STAT_VALUE = "mt-1.5 font-mono text-[23px] tracking-[-0.02em]";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (value: number) => String(value).padStart(2, "0");

function utcClock(): string {
  const now = new Date();
  return `${pad(now.getUTCDate())} ${MONTHS[now.getUTCMonth()]} · ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}Z`;
}

export function ArtifactCard() {
  const typed = useTypewriter(ARTIFACT.headline);

  return (
    <div className="relative w-full overflow-hidden rounded-[14px] border border-border bg-coverage/5">
      <div className="atlas4-sweep atlas4-sweep-fill pointer-events-none absolute inset-x-0 top-0 h-8.5" />

      <div className={cn("flex justify-between border-b border-border px-4 py-3.25", META_CLASS)}>
        <span>{ARTIFACT.header}</span>
        <span>{utcClock()}</span>
      </div>

      <div className="px-4 pb-4.5 pt-5">
        <div className="text-[22px] font-medium leading-[1.26] tracking-[-0.028em]">
          {typed}
          <span className="atlas4-caret text-conviction">|</span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-px bg-border">
          <div className="bg-card-2 px-2.5 py-3">
            <div className={STAT_LABEL}>coverage</div>
            <div className={STAT_VALUE}>{ARTIFACT.coverage}</div>
          </div>
          <div className="bg-card-2 px-2.5 py-3">
            <div className={STAT_LABEL}>conviction</div>
            <div className={cn(STAT_VALUE, "text-conviction")}>{ARTIFACT.conviction}</div>
          </div>
          <div className="bg-card-2 px-2.5 py-3">
            <div className={STAT_LABEL}>gap</div>
            <div className={cn(STAT_VALUE, "text-gap-negative")}>{ARTIFACT.gap}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.75 text-[10.5px] text-foreground/40">
          {ARTIFACT.sources.map((source) => (
            <span key={source} className="rounded-full border border-border px-2.25 py-1">
              {source}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
