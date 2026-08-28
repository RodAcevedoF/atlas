import type { InquiryRunStatus, UserRole } from "@atlas/domain";
import { INQUIRY_RUN_STATUSES, USER_ROLES } from "@atlas/domain";
import type { UserStorePort } from "../../auth/outbound/user-store.ts";
import type { InquiryRunStorePort } from "../../inquiry/outbound/inquiry-run-store.ts";

export interface AdminUserAnalytics {
  total: number;
  byRole: Record<UserRole, number>;
}

export interface AdminInquiryAnalytics {
  total: number;
  today: number;
  byStatus: Record<InquiryRunStatus, number>;
  retrievalCostUsd: number;
}

export interface AdminAnalytics {
  users: AdminUserAnalytics;
  inquiries: AdminInquiryAnalytics;
}

export interface GetAdminAnalytics {
  execute(): Promise<AdminAnalytics>;
}

function completeCounts<Key extends string>(
  keys: readonly Key[],
  sparse: Partial<Record<Key, number>>,
): Record<Key, number> {
  const counts = {} as Record<Key, number>;
  for (const key of keys) {
    counts[key] = sparse[key] ?? 0;
  }
  return counts;
}

export class GetAdminAnalyticsUseCase implements GetAdminAnalytics {
  constructor(
    private readonly users: UserStorePort,
    private readonly inquiries: InquiryRunStorePort,
  ) {}

  async execute(): Promise<AdminAnalytics> {
    const day = new Date().toISOString().slice(0, 10);
    const [roleCounts, inquiryTotals] = await Promise.all([
      this.users.countUsersByRole(),
      this.inquiries.summarizeInquiryRuns(day),
    ]);
    const byRole = completeCounts(USER_ROLES, roleCounts);
    return {
      users: {
        total: USER_ROLES.reduce((sum, role) => sum + byRole[role], 0),
        byRole,
      },
      inquiries: {
        total: inquiryTotals.total,
        today: inquiryTotals.today,
        byStatus: completeCounts(INQUIRY_RUN_STATUSES, inquiryTotals.byStatus),
        retrievalCostUsd: inquiryTotals.retrievalCostUsd,
      },
    };
  }
}
