import type { PublicUser } from "@atlas/domain";
import { makeSessionToken, toPublicUser } from "@atlas/domain";
import type { SessionPort } from "../outbound/session-store.ts";
import type { UserStorePort } from "../outbound/user-store.ts";
import type { Authenticate } from "./auth.ts";

export class AuthenticateUseCase implements Authenticate {
  constructor(
    private readonly sessions: SessionPort,
    private readonly users: UserStorePort,
  ) {}

  async execute(token: string): Promise<PublicUser | null> {
    const session = await this.sessions.find(makeSessionToken(token));
    if (!session) return null;

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.sessions.delete(session.token);
      return null;
    }

    const user = await this.users.findUserById(session.userId);
    return user ? toPublicUser(user) : null;
  }
}
