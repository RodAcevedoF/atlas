import { AccountMenu } from "@/features/auth/components/account-menu.tsx";
import { AppHeader } from "@/shared/app-shell";

interface TopBarProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  canRefresh: boolean;
}

function Spinner() {
  return (
    <span className="inline-block h-3.25 w-3.25 animate-spin rounded-full border-[1.8px] border-current border-t-transparent" />
  );
}

export function TopBar({ onRefresh, isRefreshing, canRefresh }: TopBarProps) {
  return (
    <AppHeader
      subtitle="World Awareness"
      account={<AccountMenu />}
      actions={
        <button
          type="button"
          onClick={onRefresh}
          disabled={!canRefresh}
          className="flex h-8.5 items-center gap-1.75 rounded-[10px] bg-primary px-3.75 text-[12.5px] font-semibold text-primary-foreground transition-[filter] hover:brightness-[1.07] disabled:opacity-70"
          style={{
            boxShadow: "0 6px 18px -8px color-mix(in srgb, var(--primary) 70%, transparent)",
          }}
        >
          {isRefreshing ? <Spinner /> : null}
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </button>
      }
    />
  );
}
