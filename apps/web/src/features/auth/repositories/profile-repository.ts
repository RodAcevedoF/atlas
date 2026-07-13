import type { GeoRegion, Topic, UserProfile } from "@atlas/domain";

export interface PreferencesInput {
  preferredRegions: GeoRegion[];
  preferredTopics: Topic[];
}

export interface ProfileRepository {
  updatePreferences(input: PreferencesInput): Promise<UserProfile>;
}
