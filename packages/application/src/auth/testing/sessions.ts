import type { Session, SessionToken } from "@atlas/domain";
import type { SessionPort } from "../outbound/session-store.ts";

export class MemorySessions implements SessionPort {
  private readonly records = new Map<SessionToken, Session>();

  async create(session: Session): Promise<void> {
    this.records.set(session.token, structuredClone(session));
  }

  async find(token: SessionToken): Promise<Session | null> {
    const session = this.records.get(token);
    return session ? structuredClone(session) : null;
  }

  async delete(token: SessionToken): Promise<void> {
    this.records.delete(token);
  }
}
