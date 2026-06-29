import type { SignalSource } from "../../repositories/market-repository.ts";
import type { PanelKey } from "../world-map/use-panel-visibility.ts";

export type SourceFilter = SignalSource | "all";

const SOURCE_OPTIONS: Array<{ id: SourceFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "market", label: "Markets" },
  { id: "news", label: "News" },
];

const PANEL_OPTIONS: Array<{ key: PanelKey; label: string }> = [
  { key: "kpis", label: "KPIs" },
  { key: "region", label: "Region" },
  { key: "topics", label: "Topics" },
  { key: "markets", label: "Markets" },
];

interface TopBarProps {
  source: SourceFilter;
  onSourceChange: (source: SourceFilter) => void;
  onSyncMarkets: () => void;
  onSyncNews: () => void;
  isSyncing: boolean;
  isSyncingNews: boolean;
  panelVisibility: Record<PanelKey, boolean>;
  anyPanelVisible: boolean;
  onToggleAllPanels: () => void;
  onTogglePanel: (panel: PanelKey) => void;
}

interface PanelDockProps {
  visibility: Record<PanelKey, boolean>;
  anyVisible: boolean;
  onToggleAll: () => void;
  onTogglePanel: (panel: PanelKey) => void;
}

function PanelDock({ visibility, anyVisible, onToggleAll, onTogglePanel }: PanelDockProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-[11px] border border-border bg-muted p-0.75">
      <button
        type="button"
        onClick={onToggleAll}
        aria-pressed={!anyVisible}
        aria-label={anyVisible ? "Hide all panels" : "Show all panels"}
        title={anyVisible ? "Hide all panels" : "Show all panels"}
        className="flex h-6.75 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {anyVisible ? (
            <>
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </>
          ) : (
            <path d="M9.9 5.2A9.5 9.5 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.4 3.2M6.1 6.1A17 17 0 0 0 2 12s3.6 7 10 7a9.3 9.3 0 0 0 4.2-1M3 3l18 18" />
          )}
        </svg>
      </button>
      <div className="mx-0.5 h-4 w-px bg-border" />
      {PANEL_OPTIONS.map((option) => {
        const isActive = visibility[option.key];
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onTogglePanel(option.key)}
            aria-pressed={isActive}
            className={`h-6.75 rounded-lg px-2.5 text-[11px] font-medium transition-colors ${
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
  );
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
  panelVisibility,
  anyPanelVisible,
  onToggleAllPanels,
  onTogglePanel,
}: TopBarProps) {
  return (
    <header className="flex h-11.5 flex-none items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-[7px]"
            style={{
              background: "linear-gradient(140deg, var(--primary), #d98235)",
              boxShadow: "0 0 0 1px rgba(255,171,88,.25), 0 4px 14px -4px rgba(255,171,88,.5)",
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--primary-foreground)"
              strokeWidth="2.4"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" />
            </svg>
          </div>
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
      </div>

      <div className="flex items-center gap-2.5">
        <PanelDock
          visibility={panelVisibility}
          anyVisible={anyPanelVisible}
          onToggleAll={onToggleAllPanels}
          onTogglePanel={onTogglePanel}
        />
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
          style={{ boxShadow: "0 6px 18px -8px rgba(255,171,88,.7)" }}
        >
          {isSyncing ? <Spinner /> : null}
          {isSyncing ? "Syncing…" : "Sync markets"}
        </button>
      </div>
    </header>
  );
}
