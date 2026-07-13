import { makeSessionToken } from "@atlas/domain";
import type { SessionPort } from "../outbound/session-store.ts";
import type { LogoutUser } from "./auth.ts";

export class LogoutUserUseCase implements LogoutUser {
  constructor(private readonly sessions: SessionPort) {}

  async execute(token: string): Promise<void> {
    await this.sessions.delete(makeSessionToken(token));
  }
}
