import type { UserId } from "@atlas/domain";
import type {
  ProfileImage,
  ProfileImageStorePort,
} from "../profile/outbound/profile-image-store.ts";

export function inMemoryProfileImageStore(): ProfileImageStorePort {
  const held = new Map<UserId, ProfileImage>();

  return {
    findProfileImage(userId) {
      return Promise.resolve(held.get(userId) ?? null);
    },
    replaceProfileImage(userId, image) {
      held.set(userId, image);
      return Promise.resolve();
    },
    deleteProfileImage(userId) {
      held.delete(userId);
      return Promise.resolve();
    },
  };
}
