import type {
  GrantableRole,
  User,
  UserId,
  UserIdentity,
  UserProfile,
  UserRole,
} from "@atlas/domain";

export interface UserPageInput {
  limit: number;
  cursor?: string;
}

export interface UserPage {
  users: User[];
  nextCursor: string | null;
}

export interface UserStorePort {
  createUser(user: User): Promise<void>;
  findUserByEmail(email: string): Promise<User | null>;
  findUserByIdentity(
    identity: Pick<UserIdentity, "provider" | "providerUserId">,
  ): Promise<User | null>;
  findUserById(id: UserId): Promise<User | null>;
  updateProfile(id: UserId, profile: UserProfile): Promise<void>;
  updateRole(id: UserId, role: GrantableRole): Promise<void>;
  updateEmail(id: UserId, email: string): Promise<void>;
  setPasswordIdentity(id: UserId, identity: UserIdentity): Promise<void>;
  deleteUser(id: UserId): Promise<void>;
  installSuperAdmin(id: UserId): Promise<void>;
  linkIdentity(id: UserId, identity: UserIdentity): Promise<void>;
  markEmailVerified(id: UserId): Promise<void>;
  countUsersByRole(): Promise<Partial<Record<UserRole, number>>>;
  listUsers(input: UserPageInput): Promise<UserPage>;
}
