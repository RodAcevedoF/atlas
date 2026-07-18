import type { UserId } from "@atlas/domain";

export interface VerificationTokenStorePort {
  save(token: string, userId: UserId, ttlMs: number): Promise<void>;
  consume(token: string): Promise<UserId | null>;
}
