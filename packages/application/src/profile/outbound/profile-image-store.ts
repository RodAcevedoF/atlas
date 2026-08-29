import type { UserId } from "@atlas/domain";

export const PROFILE_IMAGE_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ProfileImageMediaType = (typeof PROFILE_IMAGE_MEDIA_TYPES)[number];

export interface ProfileImage {
  mediaType: ProfileImageMediaType;
  bytes: Uint8Array;
}

export interface ProfileImageStorePort {
  findProfileImage(userId: UserId): Promise<ProfileImage | null>;
  replaceProfileImage(userId: UserId, image: ProfileImage): Promise<void>;
  deleteProfileImage(userId: UserId): Promise<void>;
}
