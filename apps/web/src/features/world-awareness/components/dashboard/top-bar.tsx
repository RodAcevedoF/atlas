import { AppNavTabs } from "@/shared/app-nav-tabs.tsx";
import type { SignalSource } from "../../repositories/market-repository.ts";

export type SourceFilter = SignalSource | "all";

const SOURCE_OPTIONS: Array<{ id: SourceFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "market", label: "Markets" },
  { id: "news", label: "News" },
];

interface TopBarProps {
  source: SourceFilter;
  onSourceChange: (source: SourceFilter) => void;
  onSyncMarkets: () => void;
  onSyncNews: () => void;
  isSyncing: boolean;
  isSyncingNews: boolean;
}

function Spinner() {
  return (
    <span className="inline-block h-3.25 w-3.25 animate-spin rounded-full border-[1.8px] border-current border-t-transparent" />
  );
}

export function TopBar({
  source,
  onSourceChange,
  onSyncMarkets,
  onSyncNews,
  isSyncing,
  isSyncingNews,
}: TopBarProps) {
  return (
    <header className="flex h-11.5 flex-none items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div className="flex items-center gap-2.5">
          <img src="/atlas_emblem.svg" alt="Atlas" className="h-6.5 w-6.5" />
          <div className="flex flex-col leading-[1.05]">
            <span className="text-[15px] font-semibold tracking-[-0.02em]">Atlas</span>
            <span className="text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
              World Awareness
            </span>
          </div>
        </div>
        <div className="h-5.5 w-px bg-border" />
        <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <span
            className="h-1.5 w-1.5 rounded-full bg-positive"
            style={{
              boxShadow: "0 0 8px var(--positive)",
              animation: "atlas-pulse 2.4s ease-in-out infinite",
            }}
          />
          Live
        </div>
        <div className="h-5.5 w-px bg-border" />
        <AppNavTabs />
      </div>

      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-0.5 rounded-[11px] border border-border bg-muted p-0.75">
          {SOURCE_OPTIONS.map((option) => {
            const isActive = source === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSourceChange(option.id)}
                className={`h-6.75 rounded-lg px-3.25 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-white/8 text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onSyncNews}
          disabled={isSyncingNews}
          className="flex h-8.5 items-center gap-1.75 rounded-[10px] border border-border-strong bg-card-2 px-3.5 text-[12.5px] font-medium text-foreground transition-colors hover:border-white/20 disabled:opacity-60"
        >
          {isSyncingNews ? <Spinner /> : null}
          {isSyncingNews ? "Syncing…" : "Sync news"}
        </button>
        <button
          type="button"
          onClick={onSyncMarkets}
          disabled={isSyncing}
          className="flex h-8.5 items-center gap-1.75 rounded-[10px] bg-primary px-3.75 text-[12.5px] font-semibold text-primary-foreground transition-[filter] hover:brightness-[1.07] disabled:opacity-70"
          style={{
            boxShadow: "0 6px 18px -8px color-mix(in srgb, var(--primary) 70%, transparent)",
          }}
        >
          {isSyncing ? <Spinner /> : null}
          {isSyncing ? "Syncing…" : "Sync markets"}
        </button>
      </div>
    </header>
  );
}
