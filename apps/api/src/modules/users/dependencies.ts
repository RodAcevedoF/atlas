import type { ChangeUserRole, UserStorePort } from "@atlas/application";
import { ChangeUserRoleUseCase } from "@atlas/application";

export interface UsersDeps {
  changeUserRole: ChangeUserRole;
}

export function makeUsersDependencies(deps: { userStore: UserStorePort }): UsersDeps {
  return {
    changeUserRole: new ChangeUserRoleUseCase(deps.userStore),
  };
}
