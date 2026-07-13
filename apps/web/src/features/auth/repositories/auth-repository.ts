import type { PublicUser } from "@atlas/domain";

export interface Credentials {
  email: string;
  password: string;
}

export interface AuthRepository {
  me(): Promise<PublicUser | null>;
  login(credentials: Credentials): Promise<PublicUser>;
  register(credentials: Credentials): Promise<PublicUser>;
  logout(): Promise<void>;
}
