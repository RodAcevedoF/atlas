import type { InquiryRunStatus, UserRole } from "@atlas/domain";

export interface AdminAnalyticsRecord {
  users: {
    total: number;
    byRole: Record<UserRole, number>;
  };
  inquiries: {
    total: number;
    today: number;
    byStatus: Record<InquiryRunStatus, number>;
    retrievalCostUsd: number;
  };
}

export interface AdminRepository {
  analytics(): Promise<AdminAnalyticsRecord>;
}
