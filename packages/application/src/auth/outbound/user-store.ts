import type {
  GrantableRole,
  User,
  UserId,
  UserIdentity,
  UserProfile,
  UserRole,
} from "@atlas/domain";

export interface UserStorePort {
  createUser(user: User): Promise<void>;
  findUserByEmail(email: string): Promise<User | null>;
  findUserById(id: UserId): Promise<User | null>;
  updateProfile(id: UserId, profile: UserProfile): Promise<void>;
  updateRole(id: UserId, role: GrantableRole): Promise<void>;
  installSuperAdmin(id: UserId): Promise<void>;
  linkIdentity(id: UserId, identity: UserIdentity): Promise<void>;
  markEmailVerified(id: UserId): Promise<void>;
  countUsersByRole(): Promise<Partial<Record<UserRole, number>>>;
}
