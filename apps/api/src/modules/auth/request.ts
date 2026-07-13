import type { LoginInput, RegisterInput } from "@atlas/application";
import { InvalidInputError } from "../../core/errors.ts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function extractCredentials(body: Record<string, unknown> | undefined): RegisterInput {
  const source = body ?? {};
  const email = typeof source.email === "string" ? source.email.trim() : "";
  const password = typeof source.password === "string" ? source.password : "";
  return { email, password };
}

export function parseCredentials(body: Record<string, unknown> | undefined): RegisterInput {
  const { email, password } = extractCredentials(body);
  if (!EMAIL_PATTERN.test(email)) throw new InvalidInputError("A valid email is required");
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new InvalidInputError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  return { email, password };
}

export function parseLoginCredentials(body: Record<string, unknown> | undefined): LoginInput {
  const { email, password } = extractCredentials(body);
  if (!email || !password) throw new InvalidInputError("Email and password are required");
  return { email, password };
}
