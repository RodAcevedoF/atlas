import type { PasswordHasherPort } from "@atlas/application";

export class BunPasswordHasher implements PasswordHasherPort {
  hash(plain: string): Promise<string> {
    return Bun.password.hash(plain);
  }

  verify(plain: string, hash: string): Promise<boolean> {
    return Bun.password.verify(plain, hash);
  }
}
