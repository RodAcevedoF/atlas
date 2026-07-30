import { Button, cn } from "@atlas/ui";
import { Link } from "react-router-dom";

interface Cta {
  label: string;
  href: string;
}

interface SlideCopyProps {
  kicker: string;
  titleLead: string;
  titleAccent: string;
  body: string;
  primary: Cta;
  secondary?: Cta;
}

const CTA_BASE = "h-auto rounded-full px-6 py-3.25 text-[13.5px] font-medium";

export function SlideCopy({
  kicker,
  titleLead,
  titleAccent,
  body,
  primary,
  secondary,
}: SlideCopyProps) {
  return (
    <div>
      <div className="inline-flex items-center gap-2.25 rounded-full border border-border bg-coverage/[0.04] px-3.5 py-1.75 text-[11.5px] uppercase tracking-[0.12em] text-foreground/80">
        <span className="h-1.25 w-1.25 rounded-full bg-conviction" />
        {kicker}
      </div>

      <h1 className="mt-6 max-w-[21ch] text-balance text-[clamp(34px,4vw,60px)] font-medium leading-[1.02] tracking-[-0.042em]">
        {titleLead} <span className="text-conviction">{titleAccent}</span>
      </h1>

      <p className="mt-5 max-w-[44ch] text-pretty text-[15.5px] leading-[1.62] text-foreground/60">
        {body}
      </p>

      <div className="mt-7.5 flex translate-y-2.5 gap-2.5 opacity-0 transition-all duration-[450ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
        <Button
          asChild
          className={cn(CTA_BASE, "bg-foreground text-primary-foreground hover:bg-conviction")}
        >
          <Link to={primary.href}>{primary.label}</Link>
        </Button>
        {secondary ? (
          <Button
            asChild
            variant="outline"
            className={cn(
              CTA_BASE,
              "border-border-strong bg-coverage/[0.07] text-foreground hover:border-foreground/50 hover:bg-coverage/[0.12] hover:text-foreground",
            )}
          >
            <Link to={secondary.href}>{secondary.label}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
