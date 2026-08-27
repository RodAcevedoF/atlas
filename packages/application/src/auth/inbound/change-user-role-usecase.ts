import type { PublicUser } from "@atlas/domain";
import { toPublicUser } from "@atlas/domain";
import type { UserStorePort } from "../outbound/user-store.ts";
import type { ChangeUserRole, ChangeUserRoleInput } from "./auth.ts";
import { RoleChangeForbiddenError, UserNotFoundError } from "./auth.ts";

export class ChangeUserRoleUseCase implements ChangeUserRole {
  constructor(private readonly users: UserStorePort) {}

  async execute(input: ChangeUserRoleInput): Promise<PublicUser> {
    if (input.actor.role !== "super_admin") {
      throw new RoleChangeForbiddenError("Only a super admin can change a role");
    }
    const target = await this.users.findUserById(input.targetUserId);
    if (!target) throw new UserNotFoundError();
    if (target.role === "super_admin") {
      throw new RoleChangeForbiddenError("A super admin's role cannot be changed");
    }

    await this.users.updateRole(target.id, input.role);
    return toPublicUser({ ...target, role: input.role });
  }
}
