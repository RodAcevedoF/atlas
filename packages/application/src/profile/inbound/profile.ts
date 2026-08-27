import type { GeoRegion, Topic, UserId, UserProfile } from "@atlas/domain";

export interface ProfileUpdateInput {
  preferredRegions: GeoRegion[];
  preferredTopics: Topic[];
}

export interface UpdateProfile {
  execute(userId: UserId, input: ProfileUpdateInput): Promise<UserProfile>;
}
