import { AccountMenu } from "@/features/auth/components/account-menu.tsx";
import { AppHeader } from "@/shared/app-shell";
import { SegmentedControl } from "@/shared/ui";
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
    <AppHeader
      subtitle="World Awareness"
      account={<AccountMenu />}
      actions={
        <>
          <SegmentedControl items={SOURCE_OPTIONS} activeId={source} onSelect={onSourceChange} />

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
        </>
      }
    />
  );
}
