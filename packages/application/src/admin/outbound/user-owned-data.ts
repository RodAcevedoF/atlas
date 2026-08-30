import type { UserId } from "@atlas/domain";

export interface UserOwnedDataPort {
  deleteUserOwnedData(userId: UserId): Promise<void>;
}
