import { eyebrowVariants } from "@/shared/ui/index.ts";
import { cn } from "@atlas/ui";

const KICKER_CLASS = cn(
  eyebrowVariants({ variant: "header" }),
  "inline-flex items-center gap-2.25 rounded-full border border-border bg-coverage/[0.04] px-3.5 py-1.75 text-foreground/80",
);

interface SlideCopyProps {
  kicker: string;
  titleLead: string;
  titleAccent: string;
  body: string;
}

export function SlideCopy({ kicker, titleLead, titleAccent, body }: SlideCopyProps) {
  return (
    <div>
      <div className={KICKER_CLASS}>
        <span className="h-1.25 w-1.25 rounded-full bg-conviction" />
        {kicker}
      </div>

      <h1 className="mt-6 max-w-[21ch] text-balance text-[clamp(34px,4vw,60px)] font-medium leading-[1.02] tracking-[-0.042em]">
        {titleLead} <span className="text-conviction">{titleAccent}</span>
      </h1>

      <p className="mt-5 max-w-[44ch] text-pretty text-[15.5px] leading-[1.62] text-foreground/60">
        {body}
      </p>
    </div>
  );
}
