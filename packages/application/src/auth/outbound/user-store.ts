import type { User, UserId, UserIdentity, UserProfile } from "@atlas/domain";

export interface UserStorePort {
  createUser(user: User): Promise<void>;
  findUserByEmail(email: string): Promise<User | null>;
  findUserById(id: UserId): Promise<User | null>;
  updateProfile(id: UserId, profile: UserProfile): Promise<void>;
  linkIdentity(id: UserId, identity: UserIdentity): Promise<void>;
}
