import type { UserId, UserProfile } from "@atlas/domain";
import type { UserStorePort } from "../ports/user-store.ts";
import type { SaveReport } from "./profile.ts";
import { UserNotFoundError } from "./profile.ts";

export class SaveReportUseCase implements SaveReport {
  constructor(private readonly users: UserStorePort) {}

  async execute(userId: UserId, reportId: string): Promise<UserProfile> {
    const user = await this.users.findUserById(userId);
    if (!user) throw new UserNotFoundError();
    if (user.profile.savedReportIds.includes(reportId)) return user.profile;

    const profile: UserProfile = {
      ...user.profile,
      savedReportIds: [...user.profile.savedReportIds, reportId],
    };
    await this.users.updateProfile(userId, profile);
    return profile;
  }
}
