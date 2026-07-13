import type { MarketStorePort, UserStorePort } from "@atlas/application";
import {
  ListSavedReportsUseCase,
  SaveReportUseCase,
  UnsaveReportUseCase,
  UpdateProfileUseCase,
} from "@atlas/application";
import { ProfileService } from "./profile-service.ts";
import type { IProfileService } from "./service.ts";

export function makeProfileDependencies(deps: {
  userStore: UserStorePort;
  store: MarketStorePort;
}): { service: IProfileService } {
  return {
    service: new ProfileService(
      new UpdateProfileUseCase(deps.userStore),
      new SaveReportUseCase(deps.userStore),
      new UnsaveReportUseCase(deps.userStore),
      new ListSavedReportsUseCase(deps.userStore, deps.store),
    ),
  };
}
