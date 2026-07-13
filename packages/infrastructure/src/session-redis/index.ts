export * from "./client.ts";

import type { SessionPort } from "@atlas/application";
import type { Session, SessionToken } from "@atlas/domain";
import { makeUserId } from "@atlas/domain";
import type { Redis } from "ioredis";

const KEY_PREFIX = "session:";

interface SessionRecord {
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export class RedisSessionStore implements SessionPort {
  constructor(private readonly redis: Redis) {}

  async create(session: Session): Promise<void> {
    const record: SessionRecord = {
      userId: session.userId,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    };
    const ttlSeconds = Math.max(1, Math.ceil((session.expiresAt.getTime() - Date.now()) / 1000));
    await this.redis.set(this.key(session.token), JSON.stringify(record), "EX", ttlSeconds);
  }

  async find(token: SessionToken): Promise<Session | null> {
    const raw = await this.redis.get(this.key(token));
    if (!raw) return null;
    const record = JSON.parse(raw) as SessionRecord;
    return {
      token,
      userId: makeUserId(record.userId),
      createdAt: new Date(record.createdAt),
      expiresAt: new Date(record.expiresAt),
    };
  }

  async delete(token: SessionToken): Promise<void> {
    await this.redis.del(this.key(token));
  }

  private key(token: SessionToken): string {
    return `${KEY_PREFIX}${token}`;
  }
}
