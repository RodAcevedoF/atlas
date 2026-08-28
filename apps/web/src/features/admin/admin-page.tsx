import { AccountMenu } from "@/features/auth/components/account-menu.tsx";
import { AppHeader } from "@/shared/app-shell";
import { PANEL } from "@/shared/ui";
import { Card, cn } from "@atlas/ui";
import { AnalyticsPanel } from "./components/analytics-panel.tsx";
import { useAdminAnalytics } from "./hooks/use-admin-analytics.ts";

const LOADING = "Loading analytics…";

export function AdminPage() {
  const { analytics, isLoading, error } = useAdminAnalytics();

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AppHeader subtitle="Admin" account={<AccountMenu />} />

      <main className="min-h-0 flex-1 overflow-y-auto px-8.5 py-7">
        {analytics ? <AnalyticsPanel analytics={analytics} /> : null}
        {!analytics && isLoading ? (
          <Card className={cn(PANEL, "p-6 text-[14px] text-muted-foreground")}>{LOADING}</Card>
        ) : null}
        {error ? <p className="text-[14px] text-destructive">{error}</p> : null}
      </main>
    </div>
  );
}
