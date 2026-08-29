import type { ProfileRepository } from "../repositories/profile-repository.ts";

export function uploadProfileImage(
  profileRepository: ProfileRepository,
  image: File,
): Promise<void> {
  return profileRepository.uploadProfileImage(image);
}

export function deleteProfileImage(profileRepository: ProfileRepository): Promise<void> {
  return profileRepository.deleteProfileImage();
}
