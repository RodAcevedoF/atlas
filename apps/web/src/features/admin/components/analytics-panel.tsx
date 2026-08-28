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
const STAT_VALUE = "mt-1.5 font-mono text-[23px] tabular-nums tracking-[-0.02em]";

function formatCost(costUsd: number): string {
  return `$${costUsd.toFixed(COST_DECIMALS)}`;
}

function StatCell({
  label,
  value,
  isAccent,
}: {
  label: string;
  value: string | number;
  isAccent?: boolean;
}) {
  return (
    <div className="bg-panel-cell px-3.5 py-3.5">
      <div className={STAT_LABEL}>{label}</div>
      <div className={cn(STAT_VALUE, isAccent ? "text-conviction" : null)}>{value}</div>
    </div>
  );
}

function AnalyticsCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className={cn(PANEL, "flex flex-col gap-4 p-5")}>
      <Eyebrow>{title}</Eyebrow>
      {children}
    </Card>
  );
}

export function AnalyticsPanel({ analytics }: { analytics: AdminAnalyticsRecord }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <AnalyticsCard title="Accounts">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] bg-border sm:grid-cols-4">
          <StatCell label="Total" value={analytics.users.total} isAccent />
          {USER_ROLES.map((role) => (
            <StatCell key={role} label={ROLE_LABEL[role]} value={analytics.users.byRole[role]} />
          ))}
        </div>
      </AnalyticsCard>

      <AnalyticsCard title="Inquiries">
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[14px] bg-border">
          <StatCell label="Total" value={analytics.inquiries.total} isAccent />
          <StatCell label="Today" value={analytics.inquiries.today} />
          <StatCell label="Retrieval" value={formatCost(analytics.inquiries.retrievalCostUsd)} />
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] bg-border sm:grid-cols-4">
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
  );
}
