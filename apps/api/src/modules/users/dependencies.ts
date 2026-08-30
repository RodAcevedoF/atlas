import type {
  ChangeUserRole,
  CreateAdminUser,
  DeleteAdminUser,
  PasswordHasherPort,
  ResetAdminUserPassword,
  UpdateAdminUserEmail,
  UserOwnedDataPort,
  UserStorePort,
} from "@atlas/application";
import {
  ChangeUserRoleUseCase,
  CreateAdminUserUseCase,
  DeleteAdminUserUseCase,
  ResetAdminUserPasswordUseCase,
  UpdateAdminUserEmailUseCase,
} from "@atlas/application";

export interface UsersDeps {
  changeUserRole: ChangeUserRole;
  createUser: CreateAdminUser;
  updateUserEmail: UpdateAdminUserEmail;
  resetUserPassword: ResetAdminUserPassword;
  deleteUser: DeleteAdminUser;
}

export function makeUsersDependencies(deps: {
  userStore: UserStorePort;
  hasher: PasswordHasherPort;
  ownedData: UserOwnedDataPort;
}): UsersDeps {
  return {
    changeUserRole: new ChangeUserRoleUseCase(deps.userStore),
    createUser: new CreateAdminUserUseCase(deps.userStore, deps.hasher),
    updateUserEmail: new UpdateAdminUserEmailUseCase(deps.userStore),
    resetUserPassword: new ResetAdminUserPasswordUseCase(deps.userStore, deps.hasher),
    deleteUser: new DeleteAdminUserUseCase(deps.userStore, deps.ownedData),
  };
}
