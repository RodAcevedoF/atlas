import type { GeoRegion, Topic, UserId, UserProfile } from "@atlas/domain";
import type { WorldScanReportRecord } from "./world-scan.ts";

export interface ProfileUpdateInput {
  preferredRegions: GeoRegion[];
  preferredTopics: Topic[];
}

export class UserNotFoundError extends Error {
  constructor() {
    super("User not found");
    this.name = "UserNotFoundError";
  }
}

export interface UpdateProfile {
  execute(userId: UserId, input: ProfileUpdateInput): Promise<UserProfile>;
}

export interface SaveReport {
  execute(userId: UserId, reportId: string): Promise<UserProfile>;
}

export interface UnsaveReport {
  execute(userId: UserId, reportId: string): Promise<UserProfile>;
}

export interface ListSavedReports {
  execute(userId: UserId): Promise<WorldScanReportRecord[]>;
}
