import type { UpdateProfile, UserStorePort } from "@atlas/application";
import { UpdateProfileUseCase } from "@atlas/application";

export interface ProfileDeps {
  updateProfile: UpdateProfile;
}

export function makeProfileDependencies(deps: { userStore: UserStorePort }): ProfileDeps {
  return {
    updateProfile: new UpdateProfileUseCase(deps.userStore),
  };
}
