import { InvalidInputError } from "./errors.ts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

export type RawQuery = Record<string, unknown>;

export function parseLimit(value: unknown): number | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

export function parseEmail(value: unknown): string {
  const email = typeof value === "string" ? value.trim() : "";
  if (!EMAIL_PATTERN.test(email)) throw new InvalidInputError("A valid email is required");
  return email;
}

export function parsePassword(value: unknown): string {
  const password = typeof value === "string" ? value : "";
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new InvalidInputError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  return password;
}
