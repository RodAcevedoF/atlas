import type { UserId, UserProfile } from "@atlas/domain";
import type { UserStorePort } from "../ports/user-store.ts";
import type { UnsaveReport } from "./profile.ts";
import { UserNotFoundError } from "./profile.ts";

export class UnsaveReportUseCase implements UnsaveReport {
  constructor(private readonly users: UserStorePort) {}

  async execute(userId: UserId, reportId: string): Promise<UserProfile> {
    const user = await this.users.findUserById(userId);
    if (!user) throw new UserNotFoundError();

    const profile: UserProfile = {
      ...user.profile,
      savedReportIds: user.profile.savedReportIds.filter((id) => id !== reportId),
    };
    await this.users.updateProfile(userId, profile);
    return profile;
  }
}
