import type { UserStorePort } from "../outbound/user-store.ts";
import type { VerificationTokenStorePort } from "../outbound/verification-token-store.ts";
import type { VerifyEmail } from "./auth.ts";
import { InvalidVerificationTokenError } from "./auth.ts";

export class VerifyEmailUseCase implements VerifyEmail {
  constructor(
    private readonly tokens: VerificationTokenStorePort,
    private readonly users: UserStorePort,
  ) {}

  async execute(token: string): Promise<void> {
    const userId = await this.tokens.consume(token);
    if (!userId) throw new InvalidVerificationTokenError();
    await this.users.markEmailVerified(userId);
  }
}
