import type { User } from "@atlas/domain";
import type { EmailMessage, EmailPort } from "../outbound/email.ts";
import type { VerificationTokenStorePort } from "../outbound/verification-token-store.ts";

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

function buildVerificationEmail(webAppUrl: string, token: string, to: string): EmailMessage {
  const link = `${webAppUrl}/verify?token=${token}`;
  return {
    to,
    subject: "Verify your Atlas email",
    html: `<p>Welcome to Atlas.</p><p>Confirm your email to unlock world scans:</p><p><a href="${link}">Verify email</a></p><p>This link expires in 24 hours.</p>`,
    text: `Welcome to Atlas.\n\nConfirm your email to unlock world scans:\n${link}\n\nThis link expires in 24 hours.`,
  };
}
