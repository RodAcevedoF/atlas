import type { EmailPort } from "@atlas/application";
import { ConsoleEmailAdapter } from "@atlas/infra/email-console";
import { ResendEmailAdapter } from "@atlas/infra/email-resend";

// Swappable email provider
export function makeEmailPort(): EmailPort {
  const provider = process.env.EMAIL_PROVIDER ?? "console";

  if (provider === "console") return new ConsoleEmailAdapter();

  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) {
      throw new Error("EMAIL_PROVIDER=resend requires RESEND_API_KEY and EMAIL_FROM");
    }
    return new ResendEmailAdapter(apiKey, from);
  }

  throw new Error(`Unknown EMAIL_PROVIDER: ${provider}`);
}
