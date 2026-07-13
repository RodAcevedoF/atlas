import type { ProfileUpdateInput, WorldScanReportRecord } from "@atlas/application";
import type { UserId, UserProfile } from "@atlas/domain";

export interface IProfileService {
  updateProfile(userId: UserId, input: ProfileUpdateInput): Promise<UserProfile>;
  saveReport(userId: UserId, reportId: string): Promise<UserProfile>;
  unsaveReport(userId: UserId, reportId: string): Promise<UserProfile>;
  listSavedReports(userId: UserId): Promise<WorldScanReportRecord[]>;
}
