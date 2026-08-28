import type { AdminAnalyticsRecord, AdminRepository } from "../repositories/admin-repository.ts";

export function makeLoadAdminAnalytics(repository: AdminRepository) {
  return (): Promise<AdminAnalyticsRecord> => repository.analytics();
}
