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
    <header className="relative z-40 flex h-17 flex-none items-center gap-6 border-b border-border px-8.5">
      <div className="flex items-center gap-3">
        <img src="/atlas_emblem.svg" alt="Atlas" className="h-7 w-7" />
        <div className="flex flex-col leading-none">
          <span className="text-[17px] font-semibold tracking-[-0.02em]">Atlas</span>
          <Eyebrow variant="header" className="mt-1 text-[9.5px]">
            {subtitle}
          </Eyebrow>
        </div>
      </div>

      <LivePulse />
      <AppNavTabs />

      <div className="ml-auto flex items-center gap-3">{actions}</div>
      {account}
    </header>
  );
}
