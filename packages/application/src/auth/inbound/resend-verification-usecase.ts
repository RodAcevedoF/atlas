import type { EmailPort } from "../outbound/email.ts";
import type { UserStorePort } from "../outbound/user-store.ts";
import type { VerificationTokenStorePort } from "../outbound/verification-token-store.ts";
import type { ResendVerification } from "./auth.ts";
import { normalizeEmail } from "./auth.ts";
import { type VerificationConfig, issueVerification } from "./verification.ts";

export class ResendVerificationUseCase implements ResendVerification {
  constructor(
    private readonly users: UserStorePort,
    private readonly tokens: VerificationTokenStorePort,
    private readonly email: EmailPort,
    private readonly verificationConfig: VerificationConfig,
  ) {}

  async execute(rawEmail: string): Promise<void> {
    const email = normalizeEmail(rawEmail);
    const user = await this.users.findUserByEmail(email);
    if (!user || user.emailVerified) return;
    await issueVerification(this.tokens, this.email, this.verificationConfig, user);
  }
}
