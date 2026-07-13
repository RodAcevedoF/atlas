import type {
  ListSavedReports,
  ProfileUpdateInput,
  SaveReport,
  UnsaveReport,
  UpdateProfile,
  WorldScanReportRecord,
} from "@atlas/application";
import type { UserId, UserProfile } from "@atlas/domain";
import type { IProfileService } from "./service.ts";

export class ProfileService implements IProfileService {
  constructor(
    private readonly updateProfileUseCase: UpdateProfile,
    private readonly saveReportUseCase: SaveReport,
    private readonly unsaveReportUseCase: UnsaveReport,
    private readonly listSavedReportsUseCase: ListSavedReports,
  ) {}

  updateProfile(userId: UserId, input: ProfileUpdateInput): Promise<UserProfile> {
    return this.updateProfileUseCase.execute(userId, input);
  }

  saveReport(userId: UserId, reportId: string): Promise<UserProfile> {
    return this.saveReportUseCase.execute(userId, reportId);
  }

  unsaveReport(userId: UserId, reportId: string): Promise<UserProfile> {
    return this.unsaveReportUseCase.execute(userId, reportId);
  }

  listSavedReports(userId: UserId): Promise<WorldScanReportRecord[]> {
    return this.listSavedReportsUseCase.execute(userId);
  }
}
