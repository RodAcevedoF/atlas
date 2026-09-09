import type { UserId } from "./user.ts";

export type SessionToken = string & { readonly _brand: "SessionToken" };
export function makeSessionToken(value: string): SessionToken {
  return value as SessionToken;
}

export interface Session {
  authenticationVersion?: number;
  token: SessionToken;
  userId: UserId;
  createdAt: Date;
  expiresAt: Date;
}
