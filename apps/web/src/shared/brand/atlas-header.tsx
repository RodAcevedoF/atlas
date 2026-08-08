import { CTA_OUTLINE, CTA_SOLID } from "@/shared/ui/index.ts";
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
        "relative z-3 flex items-center justify-between gap-4 px-8.5 py-6.5",
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

interface HeaderCtaProps {
  to: string;
  variant: "solid" | "ghost";
  children: ReactNode;
}

export function HeaderCta({ to, variant, children }: HeaderCtaProps) {
  return (
    <Button
      asChild
      variant={null}
      size="pillSm"
      className={variant === "ghost" ? CTA_OUTLINE : CTA_SOLID}
    >
      <Link to={to}>{children}</Link>
    </Button>
  );
}
