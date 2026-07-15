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

export type IdentityProvider = "password" | "github" | "google";

export interface UserIdentity {
  provider: IdentityProvider;
  providerUserId: string;
  email: string;
  secret?: string;
}

export interface User {
  id: UserId;
  email: string;
  identities: UserIdentity[];
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

export function findIdentity(user: User, provider: IdentityProvider): UserIdentity | undefined {
  return user.identities.find((identity) => identity.provider === provider);
}

export function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, profile: user.profile };
}
