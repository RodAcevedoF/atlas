import type { EmailMessage, EmailPort } from "@atlas/application";

// dev adapter
export class ConsoleEmailAdapter implements EmailPort {
  async send(message: EmailMessage): Promise<void> {
    console.info(`[email] to=${message.to} subject="${message.subject}"\n${message.text}`);
  }
}
