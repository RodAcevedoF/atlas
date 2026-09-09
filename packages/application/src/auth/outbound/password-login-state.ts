export interface PasswordLoginState {
  version: string;
  failures: number;
  lockedUntil: number;
  leaseUntil: number;
  expiresAt: number;
}

export interface PasswordLoginStatePort {
  read(account: string): Promise<PasswordLoginState | null>;
  compareAndSet(
    account: string,
    expectedVersion: string | null,
    next: PasswordLoginState | null,
  ): Promise<boolean>;
}
