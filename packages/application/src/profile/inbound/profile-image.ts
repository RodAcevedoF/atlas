import type { UserId } from "@atlas/domain";
import {
  PROFILE_IMAGE_MEDIA_TYPES,
  type ProfileImage,
  type ProfileImageMediaType,
  type ProfileImageStorePort,
} from "../outbound/profile-image-store.ts";

export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export class InvalidProfileImageError extends Error {
  constructor(message = "Choose a JPEG, PNG, or WebP image") {
    super(message);
    this.name = "InvalidProfileImageError";
  }
}

export class ProfileImageTooLargeError extends Error {
  constructor() {
    super("Profile image must be 5 MB or smaller");
    this.name = "ProfileImageTooLargeError";
  }
}

export interface UploadProfileImageInput {
  mediaType: string;
  bytes: Uint8Array;
}

export interface UploadProfileImage {
  execute(userId: UserId, input: UploadProfileImageInput): Promise<void>;
}

export interface GetProfileImage {
  execute(userId: UserId): Promise<ProfileImage | null>;
}

export interface DeleteProfileImage {
  execute(userId: UserId): Promise<void>;
}

function isProfileImageMediaType(value: string): value is ProfileImageMediaType {
  return PROFILE_IMAGE_MEDIA_TYPES.some((mediaType) => mediaType === value);
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function matchesMediaType(bytes: Uint8Array, mediaType: ProfileImageMediaType): boolean {
  if (mediaType === "image/jpeg") return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (mediaType === "image/png")
    return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes.slice(8), [0x57, 0x45, 0x42, 0x50])
  );
}

export class UploadProfileImageUseCase implements UploadProfileImage {
  constructor(private readonly images: ProfileImageStorePort) {}

  async execute(userId: UserId, input: UploadProfileImageInput): Promise<void> {
    if (input.bytes.byteLength > PROFILE_IMAGE_MAX_BYTES) throw new ProfileImageTooLargeError();
    if (!isProfileImageMediaType(input.mediaType)) throw new InvalidProfileImageError();
    if (!matchesMediaType(input.bytes, input.mediaType)) throw new InvalidProfileImageError();

    await this.images.replaceProfileImage(userId, {
      mediaType: input.mediaType,
      bytes: input.bytes,
    });
  }
}

export class GetProfileImageUseCase implements GetProfileImage {
  constructor(private readonly images: ProfileImageStorePort) {}

  execute(userId: UserId): Promise<ProfileImage | null> {
    return this.images.findProfileImage(userId);
  }
}

export class DeleteProfileImageUseCase implements DeleteProfileImage {
  constructor(private readonly images: ProfileImageStorePort) {}

  execute(userId: UserId): Promise<void> {
    return this.images.deleteProfileImage(userId);
  }
}
