import type { User } from "@atlas/domain";
import type { EmailPort } from "../outbound/email.ts";
import type { VerificationTokenStorePort } from "../outbound/verification-token-store.ts";
import { buildVerificationEmail } from "./verification-email.ts";

export const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export interface VerificationConfig {
  webAppUrl: string;
}

export async function issueVerification(
  tokens: VerificationTokenStorePort,
  email: EmailPort,
  config: VerificationConfig,
  user: User,
): Promise<void> {
  const token = crypto.randomUUID();
  await tokens.save(token, user.id, VERIFICATION_TTL_MS);
  await email.send(buildVerificationEmail(config.webAppUrl, token, user.email));
}
