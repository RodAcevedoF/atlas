import { RUN_STATUS_LABEL } from "@/features/inquiry";
import { Eyebrow, PANEL, eyebrowVariants } from "@/shared/ui";
import type { UserRole } from "@atlas/domain";
import { INQUIRY_RUN_STATUSES, USER_ROLES } from "@atlas/domain";
import { Card, cn } from "@atlas/ui";
import type { ReactNode } from "react";
import type { AdminAnalyticsRecord } from "../repositories/admin-repository.ts";

const COST_DECIMALS = 3;

const ROLE_LABEL: Record<UserRole, string> = {
  user: "Users",
  admin: "Admins",
  super_admin: "Super admins",
};

const STAT_LABEL = cn(eyebrowVariants({ variant: "header" }), "text-faint");
const STAT_VALUE = "mt-2 font-mono text-[26px] tabular-nums tracking-[-0.035em]";

function formatCost(costUsd: number): string {
  return `$${costUsd.toFixed(COST_DECIMALS)}`;
}

function StatCell({
  label,
  value,
  isAccent,
  className,
}: {
  label: string;
  value: string | number;
  isAccent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("bg-panel-cell px-3.5 py-3.5", className)}>
      <div className={STAT_LABEL}>{label}</div>
      <div className={cn(STAT_VALUE, isAccent ? "text-conviction" : null)}>{value}</div>
    </div>
  );
}

function AnalyticsCard({
  title,
  children,
  className,
}: { title: string; children: ReactNode; className?: string }) {
  return (
    <Card className={cn(PANEL, "flex flex-col gap-4 p-5", className)}>
      <Eyebrow>{title}</Eyebrow>
      {children}
    </Card>
  );
}

function KpiCard({
  label,
  value,
  isAccent,
}: {
  label: string;
  value: string | number;
  isAccent?: boolean;
}) {
  return (
    <Card className={cn(PANEL, "overflow-hidden p-1")}>
      <StatCell label={label} value={value} isAccent={isAccent} className="rounded-[18px]" />
    </Card>
  );
}

export function AnalyticsPanel({ analytics }: { analytics: AdminAnalyticsRecord }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Accounts" value={analytics.users.total} isAccent />
        <KpiCard label="All inquiries" value={analytics.inquiries.total} />
        <KpiCard label="Inquiries today" value={analytics.inquiries.today} />
        <KpiCard label="Retrieval spend" value={formatCost(analytics.inquiries.retrievalCostUsd)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <AnalyticsCard title="Access mix">
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[14px] bg-border">
            {USER_ROLES.map((role) => (
              <StatCell key={role} label={ROLE_LABEL[role]} value={analytics.users.byRole[role]} />
            ))}
          </div>
        </AnalyticsCard>

        <AnalyticsCard title="Run health">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] bg-border sm:grid-cols-4 xl:grid-cols-7">
            {INQUIRY_RUN_STATUSES.map((status) => (
              <StatCell
                key={status}
                label={RUN_STATUS_LABEL[status]}
                value={analytics.inquiries.byStatus[status]}
              />
            ))}
          </div>
        </AnalyticsCard>
      </div>
    </div>
  );
}
