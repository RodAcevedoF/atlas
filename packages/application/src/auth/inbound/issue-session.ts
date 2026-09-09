import type { Session, UserId } from "@atlas/domain";
import { makeSessionToken } from "@atlas/domain";
import type { SessionPort } from "../outbound/session-store.ts";

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function issueSession(
  sessions: SessionPort,
  userId: UserId,
  authenticationVersion = 0,
): Promise<Session> {
  const now = new Date();
  const session: Session = {
    token: makeSessionToken(`${crypto.randomUUID()}${crypto.randomUUID()}`),
    userId,
    authenticationVersion,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
  };
  await sessions.create(session);
  return session;
}
