import type { GetAdminAnalytics, InquiryRunStorePort, UserStorePort } from "@atlas/application";
import { GetAdminAnalyticsUseCase } from "@atlas/application";

export interface AdminDeps {
  getAdminAnalytics: GetAdminAnalytics;
}

export function makeAdminDependencies(deps: {
  userStore: UserStorePort;
  inquiryStore: InquiryRunStorePort;
}): AdminDeps {
  return {
    getAdminAnalytics: new GetAdminAnalyticsUseCase(deps.userStore, deps.inquiryStore),
  };
}
