import type { GrantableRole, UserId } from "@atlas/domain";
import { isGrantableRole, makeUserId } from "@atlas/domain";
import { InvalidInputError } from "../../core/errors.ts";

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
