import { AccountMenu } from "@/features/auth/components/account-menu.tsx";
import type { InquiryRunSummaryRecord } from "@/features/inquiry";
import { AppHeader } from "@/shared/app-shell";
import type { WorldRefresh } from "../../hooks/use-world-awareness.ts";
import { InquiryPicker } from "./inquiry-picker.tsx";
import { RefreshControl } from "./refresh-control.tsx";

interface TopBarProps {
  runs: InquiryRunSummaryRecord[];
  shownRun: InquiryRunSummaryRecord | null;
  onSelectRun: (runId: string) => void;
  refresh: WorldRefresh;
}

export function TopBar({ runs, shownRun, onSelectRun, refresh }: TopBarProps) {
  return (
    <AppHeader
      subtitle="World Awareness"
      account={<AccountMenu />}
      actions={
        <>
          <InquiryPicker runs={runs} shownRun={shownRun} onSelect={onSelectRun} />
          <RefreshControl refresh={refresh} />
        </>
      }
    />
  );
}
