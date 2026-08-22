import { AccountMenu } from "@/features/auth/components/account-menu.tsx";
import { AppHeader } from "@/shared/app-shell";
import { InquiryRunsBoard } from "./components/inquiry-runs-board.tsx";

export function IntelligencePage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AppHeader subtitle="Intelligence" account={<AccountMenu />} />

      <main className="min-h-0 flex-1 overflow-hidden">
        <InquiryRunsBoard />
      </main>
    </div>
  );
}
