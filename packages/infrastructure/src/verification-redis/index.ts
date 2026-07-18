import type { VerificationTokenStorePort } from "@atlas/application";
import type { UserId } from "@atlas/domain";
import { makeUserId } from "@atlas/domain";
import type { Redis } from "ioredis";

const KEY_PREFIX = "verification:";

export class RedisVerificationTokenStore implements VerificationTokenStorePort {
  constructor(private readonly redis: Redis) {}

  async save(token: string, userId: UserId, ttlMs: number): Promise<void> {
    const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
    await this.redis.set(this.key(token), userId, "EX", ttlSeconds);
  }

  async consume(token: string): Promise<UserId | null> {
    const value = await this.redis.getdel(this.key(token));
    return value ? makeUserId(value) : null;
  }

  private key(token: string): string {
    return `${KEY_PREFIX}${token}`;
  }
}
