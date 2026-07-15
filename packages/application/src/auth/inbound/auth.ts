import type { IdentityProvider, PublicUser } from "@atlas/domain";

export interface RegisterInput {
  email: string;
  password: string;
}

export type LoginInput = RegisterInput;

export interface LoginResult {
  token: string;
  user: PublicUser;
}

export class EmailInUseError extends Error {
  constructor(email: string) {
    super(`Email already registered: ${email}`);
    this.name = "EmailInUseError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

export class UnknownProviderError extends Error {
  constructor(provider: string) {
    super(`Unknown or disabled identity provider: ${provider}`);
    this.name = "UnknownProviderError";
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface RegisterUser {
  execute(input: RegisterInput): Promise<LoginResult>;
}

export interface AuthenticateWithProviderInput {
  provider: IdentityProvider;
  payload: unknown;
}

export interface AuthenticateWithProvider {
  execute(input: AuthenticateWithProviderInput): Promise<LoginResult>;
}

export interface LogoutUser {
  execute(token: string): Promise<void>;
}

export interface Authenticate {
  execute(token: string): Promise<PublicUser | null>;
}
