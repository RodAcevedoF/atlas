import type { EmailMessage, EmailPort } from "@atlas/application";
import nodemailer from "nodemailer";

export interface SmtpEmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

export class SmtpEmailAdapter implements EmailPort {
  private readonly transporter: ReturnType<typeof nodemailer.createTransport>;

  constructor(
    config: SmtpEmailConfig,
    private readonly from: string,
  ) {
    this.transporter = nodemailer.createTransport({
      ...config,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  }
}
