import type {
  DeleteProfileImage,
  GetProfileImage,
  ProfileImageStorePort,
  UpdateProfile,
  UploadProfileImage,
  UserStorePort,
} from "@atlas/application";
import {
  DeleteProfileImageUseCase,
  GetProfileImageUseCase,
  UpdateProfileUseCase,
  UploadProfileImageUseCase,
} from "@atlas/application";

export interface ProfileDeps {
  updateProfile: UpdateProfile;
  uploadProfileImage: UploadProfileImage;
  getProfileImage: GetProfileImage;
  deleteProfileImage: DeleteProfileImage;
}

export function makeProfileDependencies(deps: {
  userStore: UserStorePort;
  profileImageStore: ProfileImageStorePort;
}): ProfileDeps {
  return {
    updateProfile: new UpdateProfileUseCase(deps.userStore),
    uploadProfileImage: new UploadProfileImageUseCase(deps.profileImageStore),
    getProfileImage: new GetProfileImageUseCase(deps.profileImageStore),
    deleteProfileImage: new DeleteProfileImageUseCase(deps.profileImageStore),
  };
}
