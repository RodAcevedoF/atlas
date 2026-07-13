import type { GeoRegion } from "./market.ts";
import type { Topic } from "./signal.ts";

export type UserId = string & { readonly _brand: "UserId" };
export function makeUserId(value: string): UserId {
  return value as UserId;
}

export interface UserProfile {
  preferredRegions: GeoRegion[];
  preferredTopics: Topic[];
  savedReportIds: string[];
}

export interface User {
  id: UserId;
  email: string;
  passwordHash: string;
  profile: UserProfile;
  createdAt: Date;
}

export interface PublicUser {
  id: UserId;
  email: string;
  profile: UserProfile;
}

export function emptyProfile(): UserProfile {
  return { preferredRegions: [], preferredTopics: [], savedReportIds: [] };
}

export function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, profile: user.profile };
}
