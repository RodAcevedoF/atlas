import { fetchJson } from "@/shared/http.ts";
import type { UserProfile } from "@atlas/domain";
import type { PreferencesInput, ProfileRepository } from "./profile-repository.ts";

export class HttpProfileRepository implements ProfileRepository {
  async updatePreferences(input: PreferencesInput): Promise<UserProfile> {
    const { profile } = await fetchJson<{ profile: UserProfile }>("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return profile;
  }
}
