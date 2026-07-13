import type { Session, SessionToken } from "@atlas/domain";

export interface SessionPort {
  create(session: Session): Promise<void>;
  find(token: SessionToken): Promise<Session | null>;
  delete(token: SessionToken): Promise<void>;
}
