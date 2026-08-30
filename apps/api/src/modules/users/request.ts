import type { GrantableRole, UserId } from "@atlas/domain";
import { isGrantableRole, makeUserId } from "@atlas/domain";
import { InvalidInputError } from "../../core/errors.ts";
import { parseEmail, parsePassword } from "../../core/parsing.ts";

export function parseUserId(value: unknown): UserId {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InvalidInputError("A user id is required");
  }
  return makeUserId(value);
}

export function parseGrantableRole(body: Record<string, unknown> | undefined): GrantableRole {
  const role = body?.role;
  if (typeof role !== "string" || !isGrantableRole(role)) {
    throw new InvalidInputError("A role of 'user' or 'admin' is required");
  }
  return role;
}

export interface AdminUserCreateRequest {
  email: string;
  password: string;
  role: GrantableRole;
}

export function parseAdminUserCreate(
  body: Record<string, unknown> | undefined,
): AdminUserCreateRequest {
  return {
    email: parseEmail(body?.email),
    password: parsePassword(body?.password),
    role: parseGrantableRole(body),
  };
}

export function parseAdminUserEmail(body: Record<string, unknown> | undefined): string {
  return parseEmail(body?.email);
}

export function parseAdminUserPassword(body: Record<string, unknown> | undefined): string {
  return parsePassword(body?.password);
}
