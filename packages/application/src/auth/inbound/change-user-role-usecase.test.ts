import { describe, expect, test } from "bun:test";
import type { PublicUser, User, UserRole } from "@atlas/domain";
import { emptyProfile, makeUserId, toPublicUser } from "@atlas/domain";
import { inMemoryUserStore } from "../../testing/user-store.fake.ts";
import { RoleChangeForbiddenError, UserNotFoundError } from "./auth.ts";
import { ChangeUserRoleUseCase } from "./change-user-role-usecase.ts";

const SUPER_ID = makeUserId("user-super");
const TARGET_ID = makeUserId("user-target");

function user(id: string, role: UserRole): User {
  return {
    id: makeUserId(id),
    email: `${id}@atlas.test`,
    emailVerified: true,
    role,
    identities: [],
    profile: emptyProfile(),
    createdAt: new Date(2026, 7, 27, 9, 0, 0),
  };
}

function actor(role: UserRole, id = SUPER_ID): PublicUser {
  return toPublicUser({ ...user("ignored", role), id });
}

describe("only a super admin can change a role", () => {
  const refused: { name: string; role: UserRole }[] = [
    { name: "an ordinary user cannot promote anyone, or the tier means nothing", role: "user" },
    {
      name: "an admin cannot mint another admin — that is the whole point of the rule",
      role: "admin",
    },
  ];

  for (const testCase of refused) {
    test(testCase.name, async () => {
      const { store, users } = inMemoryUserStore([user("user-target", "user")]);
      const useCase = new ChangeUserRoleUseCase(store);

      const attempt = useCase.execute({
        actor: actor(testCase.role, makeUserId("user-actor")),
        targetUserId: TARGET_ID,
        role: "admin",
      });

      await expect(attempt).rejects.toBeInstanceOf(RoleChangeForbiddenError);
      expect(users()[0]?.role).toBe("user");
    });
  }

  test("a super admin promotes a user to admin", async () => {
    const { store, users } = inMemoryUserStore([user("user-target", "user")]);
    const useCase = new ChangeUserRoleUseCase(store);

    const updated = await useCase.execute({
      actor: actor("super_admin"),
      targetUserId: TARGET_ID,
      role: "admin",
    });

    expect(updated.role).toBe("admin");
    expect(users()[0]?.role).toBe("admin");
  });

  test("a super admin demotes an admin back to user", async () => {
    const { store, users } = inMemoryUserStore([user("user-target", "admin")]);
    const useCase = new ChangeUserRoleUseCase(store);

    const updated = await useCase.execute({
      actor: actor("super_admin"),
      targetUserId: TARGET_ID,
      role: "user",
    });

    expect(updated.role).toBe("user");
    expect(users()[0]?.role).toBe("user");
  });
});

describe("the super admin tier stays exactly one account", () => {
  test("a super admin cannot change their own role, so the tier cannot be emptied", async () => {
    const { store, users } = inMemoryUserStore([user("user-super", "super_admin")]);
    const useCase = new ChangeUserRoleUseCase(store);

    const attempt = useCase.execute({
      actor: actor("super_admin"),
      targetUserId: SUPER_ID,
      role: "admin",
    });

    await expect(attempt).rejects.toBeInstanceOf(RoleChangeForbiddenError);
    expect(users()[0]?.role).toBe("super_admin");
  });

  test("another super admin cannot be demoted either, whoever asks", async () => {
    const { store, users } = inMemoryUserStore([user("user-target", "super_admin")]);
    const useCase = new ChangeUserRoleUseCase(store);

    const attempt = useCase.execute({
      actor: actor("super_admin"),
      targetUserId: TARGET_ID,
      role: "user",
    });

    await expect(attempt).rejects.toBeInstanceOf(RoleChangeForbiddenError);
    expect(users()[0]?.role).toBe("super_admin");
  });
});

describe("ChangeUserRoleUseCase", () => {
  test("an unknown target is reported rather than silently ignored", async () => {
    const { store } = inMemoryUserStore([]);
    const useCase = new ChangeUserRoleUseCase(store);

    const attempt = useCase.execute({
      actor: actor("super_admin"),
      targetUserId: TARGET_ID,
      role: "admin",
    });

    await expect(attempt).rejects.toBeInstanceOf(UserNotFoundError);
  });
});
