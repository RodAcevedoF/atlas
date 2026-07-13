import type {
  ListSavedReports,
  SaveReport,
  UnsaveReport,
  UpdateProfile,
  UserStorePort,
  WorldScanReportStorePort,
} from "@atlas/application";
import {
  ListSavedReportsUseCase,
  SaveReportUseCase,
  UnsaveReportUseCase,
  UpdateProfileUseCase,
} from "@atlas/application";

export interface ProfileDeps {
  updateProfile: UpdateProfile;
  saveReport: SaveReport;
  unsaveReport: UnsaveReport;
  listSavedReports: ListSavedReports;
}

export function makeProfileDependencies(deps: {
  userStore: UserStorePort;
  store: WorldScanReportStorePort;
}): ProfileDeps {
  return {
    updateProfile: new UpdateProfileUseCase(deps.userStore),
    saveReport: new SaveReportUseCase(deps.userStore),
    unsaveReport: new UnsaveReportUseCase(deps.userStore),
    listSavedReports: new ListSavedReportsUseCase(deps.userStore, deps.store),
  };
}
