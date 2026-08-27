import { describe, expect, test } from "bun:test";
import type { UserRole } from "@atlas/domain";
import { mayDeleteRun } from "./may-delete-run.ts";

interface Run {
  id: string;
  ownerId: string | null;
}

interface Deleter {
  id: string;
  role: UserRole;
}

const OWNED: Run = { id: "run-1", ownerId: "user-owner" };
const ORPHANED: Run = { id: "run-1", ownerId: null };

const owner: Deleter = { id: "user-owner", role: "user" };
const stranger: Deleter = { id: "user-stranger", role: "user" };
const admin: Deleter = { id: "user-admin", role: "admin" };
const superAdmin: Deleter = { id: "user-super", role: "super_admin" };

describe("who sees the delete control", () => {
  const cases: { name: string; run: Run; deleter: Deleter; allowed: boolean }[] = [
    { name: "the owner, whose inquiry it is", run: OWNED, deleter: owner, allowed: true },
    {
      name: "not a stranger — the control would only earn them a 403",
      run: OWNED,
      deleter: stranger,
      allowed: false,
    },
    {
      name: "not an admin either, matching the server rule rather than guessing at it",
      run: OWNED,
      deleter: admin,
      allowed: false,
    },
    { name: "a super admin, over any inquiry", run: OWNED, deleter: superAdmin, allowed: true },
    {
      name: "nobody ordinary inherits a run that predates ownership",
      run: ORPHANED,
      deleter: stranger,
      allowed: false,
    },
    {
      name: "a super admin can still clear an ownerless run",
      run: ORPHANED,
      deleter: superAdmin,
      allowed: true,
    },
  ];

  for (const testCase of cases) {
    test(testCase.name, () => {
      const allowed = mayDeleteRun({
        run: testCase.run,
        deleter: testCase.deleter,
        pinnedRunId: null,
      });

      expect(allowed).toBe(testCase.allowed);
    });
  }
});

describe("the pinned run keeps its control hidden", () => {
  test("even from a super admin, because the map would lose its backdrop", () => {
    const allowed = mayDeleteRun({ run: OWNED, deleter: superAdmin, pinnedRunId: "run-1" });

    expect(allowed).toBe(false);
  });

  test("and from its own owner", () => {
    const allowed = mayDeleteRun({ run: OWNED, deleter: owner, pinnedRunId: "run-1" });

    expect(allowed).toBe(false);
  });
});

describe("mayDeleteRun", () => {
  test("a signed-out visitor is offered nothing", () => {
    const allowed = mayDeleteRun({ run: OWNED, deleter: null, pinnedRunId: null });

    expect(allowed).toBe(false);
  });

  test("no selected run means no control", () => {
    const allowed = mayDeleteRun({ run: null, deleter: owner, pinnedRunId: null });

    expect(allowed).toBe(false);
  });
});
