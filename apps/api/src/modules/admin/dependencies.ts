import type {
  GetAdminAnalytics,
  InquiryRunStorePort,
  ListAdminUsers,
  UserStorePort,
} from "@atlas/application";
import { GetAdminAnalyticsUseCase, ListAdminUsersUseCase } from "@atlas/application";

export interface AdminDeps {
  getAdminAnalytics: GetAdminAnalytics;
  listAdminUsers: ListAdminUsers;
}

export function makeAdminDependencies(deps: {
  userStore: UserStorePort;
  inquiryStore: InquiryRunStorePort;
}): AdminDeps {
  return {
    getAdminAnalytics: new GetAdminAnalyticsUseCase(deps.userStore, deps.inquiryStore),
    listAdminUsers: new ListAdminUsersUseCase(deps.userStore),
  };
}
