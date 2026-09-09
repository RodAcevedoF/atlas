import type { PasswordHasherPort } from "@atlas/application";

export class HeldHasher implements PasswordHasherPort {
  private release: () => void = () => {
    throw new Error("Hasher gate not initialized");
  };
  private verified: () => void = () => {
    throw new Error("Verification signal not initialized");
  };
  readonly verificationReached = new Promise<void>((resolve) => {
    this.verified = resolve;
  });
  private readonly gate = new Promise<void>((resolve) => {
    this.release = resolve;
  });

  constructor(private readonly hasher: PasswordHasherPort) {}

  hash(plain: string): Promise<string> {
    return this.hasher.hash(plain);
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    const matches = await this.hasher.verify(plain, hash);
    this.verified();
    await this.gate;
    return matches;
  }

  resume(): void {
    this.release();
  }
}
