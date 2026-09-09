import type { UserProfile } from "@atlas/domain";
import type { PreferencesInput, ProfileRepository } from "../repositories/profile-repository.ts";

export class InMemoryProfileRepository implements ProfileRepository {
  image: Blob | null = null;
  async getProfileImage(): Promise<Blob | null> {
    return this.image;
  }
  async uploadProfileImage(image: File): Promise<void> {
    this.image = image;
  }
  async deleteProfileImage(): Promise<void> {
    this.image = null;
  }
  async updatePreferences(_input: PreferencesInput): Promise<UserProfile> {
    throw new Error("Preferences are outside the profile image test");
  }
}
