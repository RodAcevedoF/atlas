import { useAuth } from "@/features/auth/auth-provider.tsx";
import { AccountMenu } from "@/features/auth/components/account-menu.tsx";
import { AppHeader } from "@/shared/app-shell";
import { AsyncState, PANEL } from "@/shared/ui";
import { Card, cn } from "@atlas/ui";
import { useCallback } from "react";
import { AnalyticsPanel } from "./components/analytics-panel.tsx";
import { UserDirectory } from "./components/user-directory.tsx";
import { useAdminAnalytics } from "./hooks/use-admin-analytics.ts";
import { useAdminUsers } from "./hooks/use-admin-users.ts";

const LOADING = "Loading analytics…";

export function AdminPage() {
  const { user } = useAuth();
  const { analytics, isLoading, error, refresh } = useAdminAnalytics();
  const usersChanged = useCallback(() => {
    void refresh();
  }, [refresh]);
  const directory = useAdminUsers(usersChanged);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AppHeader subtitle="Admin" account={<AccountMenu />} />

      <main className="min-h-0 flex-1 overflow-y-auto px-5 py-7 sm:px-8.5">
        <div className="mx-auto grid w-full max-w-[1440px] gap-6">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Operations
            </p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-[-0.035em] text-card-foreground">
                  Platform overview
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Account access, research volume, and run health in one place.
                </p>
              </div>
              {user ? (
                <div className="flex min-h-8 w-48 shrink-0 items-center justify-end">
                  {analytics && isLoading ? (
                    <AsyncState
                      activity="active"
                      className="gap-2 text-xs"
                      flowClassName="h-5 w-12"
                    >
                      Refreshing analytics…
                    </AsyncState>
                  ) : (
                    <span className="rounded-full border border-border bg-background/35 px-3 py-1.5 text-xs capitalize text-muted-foreground">
                      {user.role.replace("_", " ")}
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          </header>

          {analytics ? (
            <div className="atlas4-reveal">
              <AnalyticsPanel analytics={analytics} />
            </div>
          ) : null}
          {!analytics && isLoading ? (
            <Card className={cn(PANEL, "p-6")}>
              <AsyncState activity="active" className="min-h-40 justify-center">
                {LOADING}
              </AsyncState>
            </Card>
          ) : null}
          {error ? (
            <Card className={cn(PANEL, "px-5 py-3")}>
              <AsyncState tone="error">{error}</AsyncState>
            </Card>
          ) : null}
          {user ? <UserDirectory currentUser={user} directory={directory} /> : null}
        </div>
      </main>
    </div>
  );
}
