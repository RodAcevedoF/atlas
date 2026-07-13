import type { UserId, UserProfile } from "@atlas/domain";
import type { UserStorePort } from "../ports/user-store.ts";
import type { ProfileUpdateInput, UpdateProfile } from "./profile.ts";
import { UserNotFoundError } from "./profile.ts";

export class UpdateProfileUseCase implements UpdateProfile {
  constructor(private readonly users: UserStorePort) {}

  async execute(userId: UserId, input: ProfileUpdateInput): Promise<UserProfile> {
    const user = await this.users.findUserById(userId);
    if (!user) throw new UserNotFoundError();

    const profile: UserProfile = {
      ...user.profile,
      preferredRegions: [...new Set(input.preferredRegions)],
      preferredTopics: [...new Set(input.preferredTopics)],
    };
    await this.users.updateProfile(userId, profile);
    return profile;
  }
}
