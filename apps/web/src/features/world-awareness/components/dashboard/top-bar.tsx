import { AccountMenu } from "@/features/auth/components/account-menu.tsx";
import type { InquiryRunSummaryRecord } from "@/features/inquiry";
import { AppHeader } from "@/shared/app-shell";
import type { WorldRefresh } from "../../hooks/use-world-awareness.ts";
import { InquiryControls } from "./inquiry-controls.tsx";

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
      actionsClassName="max-[590px]:mx-auto max-[590px]:max-w-88 max-[590px]:flex-nowrap max-[590px]:[&>div:first-child]:flex-1 max-[590px]:[&>div:first-child>button]:w-full max-[590px]:[&>div:first-child>button]:max-w-none min-[590px]:max-xl:hidden"
      actions={
        <InquiryControls
          runs={runs}
          shownRun={shownRun}
          onSelectRun={onSelectRun}
          refresh={refresh}
        />
      }
    />
  );
}
