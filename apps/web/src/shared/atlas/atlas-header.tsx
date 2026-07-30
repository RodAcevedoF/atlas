import { Button, cn } from "@atlas/ui";
import { type ReactNode, memo } from "react";
import { Link } from "react-router-dom";
import { ATLAS_STATS } from "./atlas-facts.ts";
import { BrandMark } from "./brand-mark.tsx";
import { useCountUp } from "./use-count-up.ts";

interface AtlasHeaderProps {
  actions?: ReactNode;
  className?: string;
}

export const AtlasHeader = memo(function AtlasHeader({ actions, className }: AtlasHeaderProps) {
  const readToday = useCountUp(ATLAS_STATS.signalsReadToday);

  return (
    <header
      className={cn(
        "relative z-[3] flex items-center justify-between gap-4 px-8.5 py-6.5",
        className,
      )}
    >
      <Link
        to="/"
        aria-label="Atlas home"
        className="rounded-sm outline-none transition-opacity hover:opacity-80 focus-visible:opacity-80"
      >
        <BrandMark />
      </Link>

      <div className="flex items-center gap-4.5">
        <span className="hidden items-center gap-2.5 font-mono text-[12px] text-foreground/60 sm:flex">
          {readToday.toLocaleString()} signals read today
          <span className="atlas4-fade h-1.5 w-1.5 rounded-full bg-conviction" />
        </span>
        {actions ? <div className="flex items-center gap-2.5">{actions}</div> : null}
      </div>
    </header>
  );
});

const HEADER_CTA_BASE = "h-auto rounded-full px-4.5 py-2 text-[13px] font-medium";

const HEADER_CTA_VARIANT = {
  solid: "bg-foreground text-primary-foreground hover:bg-conviction",
  ghost:
    "border border-border-strong bg-coverage/[0.06] text-foreground hover:border-foreground/50 hover:bg-coverage/[0.12] hover:text-foreground",
} as const;

interface HeaderCtaProps {
  to: string;
  variant: keyof typeof HEADER_CTA_VARIANT;
  children: ReactNode;
}

export function HeaderCta({ to, variant, children }: HeaderCtaProps) {
  return (
    <Button
      asChild
      variant={variant === "ghost" ? "outline" : "default"}
      className={cn(HEADER_CTA_BASE, HEADER_CTA_VARIANT[variant])}
    >
      <Link to={to}>{children}</Link>
    </Button>
  );
}
