import type { LoginInput, RegisterInput } from "@atlas/application";
import { InvalidInputError } from "../../core/errors.ts";
import { parseEmail, parsePassword } from "../../core/parsing.ts";

function extractCredentials(body: Record<string, unknown> | undefined): RegisterInput {
  const source = body ?? {};
  const email = typeof source.email === "string" ? source.email.trim() : "";
  const password = typeof source.password === "string" ? source.password : "";
  return { email, password };
}

export function parseCredentials(body: Record<string, unknown> | undefined): RegisterInput {
  return { email: parseEmail(body?.email), password: parsePassword(body?.password) };
}

export function parseLoginCredentials(body: Record<string, unknown> | undefined): LoginInput {
  const { email, password } = extractCredentials(body);
  if (!email || !password) throw new InvalidInputError("Email and password are required");
  return { email, password };
}

export function parseVerificationToken(body: Record<string, unknown> | undefined): string {
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!token) throw new InvalidInputError("A verification token is required");
  return token;
}

export function parseResendEmail(body: Record<string, unknown> | undefined): string {
  return parseEmail(body?.email);
}
