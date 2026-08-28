import { describe, expect, test } from "bun:test";
import type { UserRole } from "./user.ts";
import { hasAtLeastRole } from "./user.ts";

describe("hasAtLeastRole", () => {
  const cases: { name: string; role: UserRole; minimum: UserRole; allowed: boolean }[] = [
    {
      name: "a user cannot enter an admin surface",
      role: "user",
      minimum: "admin",
      allowed: false,
    },
    {
      name: "an admin can enter an admin surface",
      role: "admin",
      minimum: "admin",
      allowed: true,
    },
    {
      name: "a super admin can enter an admin surface — the hierarchy, not a second check",
      role: "super_admin",
      minimum: "admin",
      allowed: true,
    },
    {
      name: "an admin cannot enter a super-admin-only surface",
      role: "admin",
      minimum: "super_admin",
      allowed: false,
    },
    {
      name: "a super admin can enter a super-admin-only surface",
      role: "super_admin",
      minimum: "super_admin",
      allowed: true,
    },
    {
      name: "a user meets the floor of user",
      role: "user",
      minimum: "user",
      allowed: true,
    },
    {
      name: "an admin meets the floor of user",
      role: "admin",
      minimum: "user",
      allowed: true,
    },
  ];

  for (const testCase of cases) {
    test(testCase.name, () => {
      expect(hasAtLeastRole(testCase.role, testCase.minimum)).toBe(testCase.allowed);
    });
  }
});
