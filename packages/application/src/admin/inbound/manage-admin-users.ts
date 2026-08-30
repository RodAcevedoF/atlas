import type { GrantableRole, PublicUser, User, UserId, UserIdentity } from "@atlas/domain";
import { emptyProfile, makeUserId, toPublicUser } from "@atlas/domain";
import {
  EmailInUseError,
  RoleChangeForbiddenError,
  UserNotFoundError,
  normalizeEmail,
} from "../../auth/inbound/auth.ts";
import type { PasswordHasherPort } from "../../auth/outbound/password-hasher.ts";
import type { UserStorePort } from "../../auth/outbound/user-store.ts";
import type { UserOwnedDataPort } from "../outbound/user-owned-data.ts";

interface AdminActionInput {
  actor: PublicUser;
}

export interface CreateAdminUserInput extends AdminActionInput {
  email: string;
  password: string;
  role: GrantableRole;
}

export interface UpdateAdminUserEmailInput extends AdminActionInput {
  targetUserId: UserId;
  email: string;
}

export interface ResetAdminUserPasswordInput extends AdminActionInput {
  targetUserId: UserId;
  password: string;
}

export interface DeleteAdminUserInput extends AdminActionInput {
  targetUserId: UserId;
}

export interface CreateAdminUser {
  execute(input: CreateAdminUserInput): Promise<PublicUser>;
}

export interface UpdateAdminUserEmail {
  execute(input: UpdateAdminUserEmailInput): Promise<void>;
}

export interface ResetAdminUserPassword {
  execute(input: ResetAdminUserPasswordInput): Promise<void>;
}

export interface DeleteAdminUser {
  execute(input: DeleteAdminUserInput): Promise<void>;
}

function requireSuperAdmin(actor: PublicUser): void {
  if (actor.role !== "super_admin") {
    throw new RoleChangeForbiddenError("Only a super admin can manage users");
  }
}

async function requireTarget(users: UserStorePort, id: UserId): Promise<User> {
  const target = await users.findUserById(id);
  if (!target) throw new UserNotFoundError();
  return target;
}

function passwordIdentity(user: User, secret: string): UserIdentity {
  return {
    provider: "password",
    providerUserId: user.id,
    email: user.email,
    secret,
  };
}

export class CreateAdminUserUseCase implements CreateAdminUser {
  constructor(
    private readonly users: UserStorePort,
    private readonly hasher: PasswordHasherPort,
  ) {}

  async execute(input: CreateAdminUserInput): Promise<PublicUser> {
    requireSuperAdmin(input.actor);
    const email = normalizeEmail(input.email);
    if (await this.users.findUserByEmail(email)) throw new EmailInUseError(email);

    const id = makeUserId(crypto.randomUUID());
    const user: User = {
      id,
      email,
      emailVerified: true,
      role: input.role,
      identities: [
        {
          provider: "password",
          providerUserId: id,
          email,
          secret: await this.hasher.hash(input.password),
        },
      ],
      profile: emptyProfile(),
      createdAt: new Date(),
    };
    await this.users.createUser(user);
    return toPublicUser(user);
  }
}

export class UpdateAdminUserEmailUseCase implements UpdateAdminUserEmail {
  constructor(private readonly users: UserStorePort) {}

  async execute(input: UpdateAdminUserEmailInput): Promise<void> {
    requireSuperAdmin(input.actor);
    const target = await requireTarget(this.users, input.targetUserId);
    const email = normalizeEmail(input.email);
    const existing = await this.users.findUserByEmail(email);
    if (existing && existing.id !== target.id) throw new EmailInUseError(email);
    await this.users.updateEmail(target.id, email);
  }
}

export class ResetAdminUserPasswordUseCase implements ResetAdminUserPassword {
  constructor(
    private readonly users: UserStorePort,
    private readonly hasher: PasswordHasherPort,
  ) {}

  async execute(input: ResetAdminUserPasswordInput): Promise<void> {
    requireSuperAdmin(input.actor);
    const target = await requireTarget(this.users, input.targetUserId);
    const secret = await this.hasher.hash(input.password);
    await this.users.setPasswordIdentity(target.id, passwordIdentity(target, secret));
  }
}

export class DeleteAdminUserUseCase implements DeleteAdminUser {
  constructor(
    private readonly users: UserStorePort,
    private readonly ownedData: UserOwnedDataPort,
  ) {}

  async execute(input: DeleteAdminUserInput): Promise<void> {
    requireSuperAdmin(input.actor);
    const target = await requireTarget(this.users, input.targetUserId);
    if (target.id === input.actor.id) {
      throw new RoleChangeForbiddenError("A super admin cannot delete their own account");
    }
    if (target.role === "super_admin") {
      throw new RoleChangeForbiddenError("A super admin account cannot be deleted");
    }
    await this.ownedData.deleteUserOwnedData(target.id);
    await this.users.deleteUser(target.id);
  }
}
