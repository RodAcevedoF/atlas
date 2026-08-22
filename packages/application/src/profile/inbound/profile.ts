import type { GeoRegion, Topic, UserId, UserProfile } from "@atlas/domain";

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
