import { InvalidCredentialsError, normalizeEmail } from "../inbound/auth.ts";
import type { IdentityProviderPort, ProviderIdentity } from "../outbound/identity-provider.ts";
import type {
  PasswordLoginState,
  PasswordLoginStatePort,
} from "../outbound/password-login-state.ts";

export class MemoryPasswordLoginState implements PasswordLoginStatePort {
  private readonly records = new Map<string, PasswordLoginState>();
  available = true;

  constructor(private readonly now: () => number) {}

  async read(account: string): Promise<PasswordLoginState | null> {
    if (!this.available) throw new Error("Login state unavailable");
    return this.current(account);
  }

  async compareAndSet(
    account: string,
    version: string | null,
    next: PasswordLoginState | null,
  ): Promise<boolean> {
    if (!this.available) throw new Error("Login state unavailable");
    if ((this.current(account)?.version ?? null) !== version) return false;
    if (next) this.records.set(account, { ...next });
    else this.records.delete(account);
    return true;
  }

  private current(account: string): PasswordLoginState | null {
    const current = this.records.get(account);
    if (!current || current.expiresAt <= this.now()) return null;
    return { ...current };
  }
}

export class MemoryPasswords implements IdentityProviderPort {
  readonly provider = "password" as const;
  readonly credentials = new Map([["owner@atlas.test", "correct"]]);
  pending: Promise<void> | null = null;
  available = true;

  async authenticate(payload: unknown): Promise<ProviderIdentity> {
    await this.pending;
    if (!this.available) throw new Error("Password store unavailable");
    const { email, password } = payload as { email: string; password: string };
    const account = normalizeEmail(email);
    if (!password || this.credentials.get(account) !== password)
      throw new InvalidCredentialsError();
    return { provider: "password", providerUserId: account, email: account, emailVerified: true };
  }
}

export function heldPasswordVerification(passwords: MemoryPasswords): () => void {
  let release: () => void = () => {
    throw new Error("Verification gate not initialized");
  };
  passwords.pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  return () => {
    passwords.pending = null;
    release();
  };
}
