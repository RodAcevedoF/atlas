import type { IdentityProviderPort, ProviderIdentity } from "../outbound/identity-provider.ts";
import type {
  PasswordLoginState,
  PasswordLoginStatePort,
} from "../outbound/password-login-state.ts";
import { InvalidCredentialsError, normalizeEmail } from "./auth.ts";

const FAILURE_LIMIT = 5;
const OBSERVATION_MS = 15 * 60_000;
const LOCK_MS = 5 * 60_000;
const LEASE_MS = 30_000;

function accountFrom(payload: unknown): string {
  if (!payload || typeof payload !== "object" || !("email" in payload)) {
    throw new InvalidCredentialsError();
  }
  if (typeof payload.email !== "string") throw new InvalidCredentialsError();
  const account = normalizeEmail(payload.email);
  if (!account || account.length > 254) throw new InvalidCredentialsError();
  return account;
}

export class GuardedPasswordProvider implements IdentityProviderPort {
  readonly provider = "password" as const;

  constructor(
    private readonly passwords: IdentityProviderPort,
    private readonly states: PasswordLoginStatePort,
    private readonly now: () => number = Date.now,
  ) {
    if (passwords.provider !== "password") throw new Error("Password provider required");
  }

  async authenticate(payload: unknown): Promise<ProviderIdentity> {
    const account = accountFrom(payload);
    const previous = await this.states.read(account);
    const now = this.now();
    if (previous && (previous.lockedUntil > now || previous.leaseUntil > now)) {
      throw new InvalidCredentialsError();
    }
    const lease: PasswordLoginState = {
      version: crypto.randomUUID(),
      failures: previous?.failures ?? 0,
      lockedUntil: 0,
      leaseUntil: now + LEASE_MS,
      expiresAt: previous?.expiresAt ?? now + OBSERVATION_MS,
    };
    const acquired = await this.states.compareAndSet(account, previous?.version ?? null, lease);
    if (!acquired) throw new InvalidCredentialsError();

    let identity: ProviderIdentity;
    try {
      identity = await this.passwords.authenticate(payload);
    } catch (error) {
      const next = error instanceof InvalidCredentialsError ? this.failed(lease) : previous;
      await this.states.compareAndSet(account, lease.version, next);
      throw error;
    }

    if (this.now() >= lease.leaseUntil) throw new InvalidCredentialsError();
    const cleared = await this.states.compareAndSet(account, lease.version, null);
    if (!cleared) throw new InvalidCredentialsError();
    return identity;
  }

  private failed(lease: PasswordLoginState): PasswordLoginState {
    const failures = lease.failures + 1;
    const lockedUntil = failures >= FAILURE_LIMIT ? this.now() + LOCK_MS : 0;
    return {
      version: crypto.randomUUID(),
      failures,
      lockedUntil,
      leaseUntil: 0,
      expiresAt: lockedUntil || lease.expiresAt,
    };
  }
}
