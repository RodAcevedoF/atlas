import type { GeoRegion, Topic } from "./taxonomy.ts";

export type UserId = string & { readonly _brand: "UserId" };
export function makeUserId(value: string): UserId {
  return value as UserId;
}

export interface UserProfile {
  preferredRegions: GeoRegion[];
  preferredTopics: Topic[];
}

export const USER_ROLES = ["user", "admin", "super_admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type GrantableRole = Exclude<UserRole, "super_admin">;

export const GRANTABLE_ROLES = USER_ROLES.filter(
  (role): role is GrantableRole => role !== "super_admin",
);

export function isGrantableRole(value: string): value is GrantableRole {
  return GRANTABLE_ROLES.some((role) => role === value);
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
  emailVerified: boolean;
  role: UserRole;
  identities: UserIdentity[];
  profile: UserProfile;
  createdAt: Date;
}

export interface PublicUser {
  id: UserId;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  profile: UserProfile;
}

export function emptyProfile(): UserProfile {
  return { preferredRegions: [], preferredTopics: [] };
}

export function findIdentity(user: User, provider: IdentityProvider): UserIdentity | undefined {
  return user.identities.find((identity) => identity.provider === provider);
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    role: user.role,
    profile: user.profile,
  };
}
