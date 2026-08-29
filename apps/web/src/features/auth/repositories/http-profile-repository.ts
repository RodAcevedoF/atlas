import { fetchJson, fetchNoContent } from "@/shared/http.ts";
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

  uploadProfileImage(image: File): Promise<void> {
    return fetchNoContent("/api/profile/image", {
      method: "PUT",
      headers: { "Content-Type": image.type },
      body: image,
    });
  }

  deleteProfileImage(): Promise<void> {
    return fetchNoContent("/api/profile/image", { method: "DELETE" });
  }
}
