import type { EmailPort } from "@atlas/application";
import { ConsoleEmailAdapter } from "@atlas/infra/email-console";
import { SmtpEmailAdapter } from "@atlas/infra/email-smtp";

export function makeEmailPort(
  environment: Record<string, string | undefined> = process.env,
): EmailPort {
  const provider = environment.EMAIL_PROVIDER ?? "console";

  if (provider === "console") return new ConsoleEmailAdapter();

  if (provider === "smtp") {
    const host = environment.SMTP_HOST;
    const from = environment.EMAIL_FROM;
    if (!host || !from) {
      throw new Error("EMAIL_PROVIDER=smtp requires SMTP_HOST and EMAIL_FROM");
    }

    const port = readSmtpPort(environment.SMTP_PORT);
    const user = environment.SMTP_USER;
    const pass = environment.SMTP_PASS;
    if ((user && !pass) || (!user && pass)) {
      throw new Error("SMTP_USER and SMTP_PASS must be provided together");
    }

    return new SmtpEmailAdapter(
      {
        host,
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
      },
      from,
    );
  }

  throw new Error(`Unknown EMAIL_PROVIDER: ${provider}`);
}

function readSmtpPort(rawPort: string | undefined): number {
  const port = Number(rawPort ?? "587");
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("SMTP_PORT must be an integer between 1 and 65535");
  }
  return port;
}
