import { BrandSymbol } from "@/shared/brand";
import { Eyebrow, eyebrowVariants } from "@/shared/ui";
import { cn } from "@atlas/ui";
import type { ReactNode } from "react";
import { AppNavTabs } from "./app-nav-tabs.tsx";

const LIVE_CLASS = cn(
  eyebrowVariants({ variant: "meta" }),
  "flex items-center gap-1.75 text-muted-foreground",
);

interface AppHeaderProps {
  subtitle: string;
  actions?: ReactNode;
  account?: ReactNode;
}

function LivePulse() {
  return (
    <div className={LIVE_CLASS}>
      <span
        className="h-1.75 w-1.75 rounded-full bg-positive"
        style={{
          boxShadow: "0 0 8px var(--positive)",
          animation: "atlas-pulse 2.4s ease-in-out infinite",
        }}
      />
      Live
    </div>
  );
}

export function AppHeader({ subtitle, actions, account }: AppHeaderProps) {
  return (
    <header className="relative z-40 flex flex-none flex-wrap items-center gap-x-3 gap-y-3 border-b border-border px-4 py-3 sm:px-6 xl:h-17 xl:flex-nowrap xl:gap-6 xl:px-8.5 xl:py-0">
      <div className="mr-auto flex shrink-0 items-center gap-3 xl:mr-0 xl:w-40">
        <BrandSymbol className="h-7 w-7 text-primary" />
        <div className="flex flex-col leading-none">
          <span className="text-[17px] font-semibold tracking-[-0.02em]">Atlas</span>
          <Eyebrow variant="header" className="mt-1 text-[9.5px] text-context/85">
            {subtitle}
          </Eyebrow>
        </div>
      </div>

      <div className="hidden xl:block">
        <LivePulse />
      </div>
      <div className="order-3 flex w-full justify-center sm:order-none sm:w-auto">
        <AppNavTabs />
      </div>

      {actions ? (
        <div className="order-4 flex w-full min-w-0 flex-wrap items-center gap-2 xl:order-none xl:ml-auto xl:w-auto xl:flex-nowrap xl:gap-3">
          {actions}
        </div>
      ) : null}
      <div className="shrink-0 sm:ml-auto xl:ml-0">{account}</div>
    </header>
  );
}
