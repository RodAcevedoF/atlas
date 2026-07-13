import type { User, UserId, UserProfile } from "@atlas/domain";

export interface UserStorePort {
  createUser(user: User): Promise<void>;
  findUserByEmail(email: string): Promise<User | null>;
  findUserById(id: UserId): Promise<User | null>;
  updateProfile(id: UserId, profile: UserProfile): Promise<void>;
}
