import { createHash } from "node:crypto";
import type { PasswordLoginState, PasswordLoginStatePort } from "@atlas/application";
import type { Redis } from "ioredis";

const COMPARE_AND_SET = `
local current = redis.call('GET', KEYS[1])
local version = current and cjson.decode(current).version or ''
if version ~= ARGV[1] then return 0 end
if ARGV[2] == '' then
  redis.call('DEL', KEYS[1])
else
  redis.call('SET', KEYS[1], ARGV[2], 'PXAT', ARGV[3])
end
return 1
`;

export class RedisPasswordLoginState implements PasswordLoginStatePort {
  constructor(private readonly redis: Redis) {}

  async read(account: string): Promise<PasswordLoginState | null> {
    const raw = await this.redis.get(this.key(account));
    return raw ? (JSON.parse(raw) as PasswordLoginState) : null;
  }

  async compareAndSet(
    account: string,
    expectedVersion: string | null,
    next: PasswordLoginState | null,
  ): Promise<boolean> {
    const result = await this.redis.eval(
      COMPARE_AND_SET,
      1,
      this.key(account),
      expectedVersion ?? "",
      next ? JSON.stringify(next) : "",
      next?.expiresAt ?? 0,
    );
    return result === 1;
  }

  private key(account: string): string {
    return `auth:password-login:v1:${createHash("sha256").update(account).digest("hex")}`;
  }
}
