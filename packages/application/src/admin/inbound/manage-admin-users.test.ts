import { describe, expect, test } from "bun:test";
import type { PublicUser, User, UserId, UserRole } from "@atlas/domain";
import { emptyProfile, makeUserId, toPublicUser } from "@atlas/domain";
import { EmailInUseError, RoleChangeForbiddenError } from "../../auth/inbound/auth.ts";
import type { PasswordHasherPort } from "../../auth/outbound/password-hasher.ts";
import { inMemoryUserStore } from "../../testing/user-store.fake.ts";
import type { UserOwnedDataPort } from "../outbound/user-owned-data.ts";
import {
  CreateAdminUserUseCase,
  DeleteAdminUserUseCase,
  ResetAdminUserPasswordUseCase,
  UpdateAdminUserEmailUseCase,
} from "./manage-admin-users.ts";

const SUPER_ID = makeUserId("super");
const TARGET_ID = makeUserId("target");

function user(id: UserId, role: UserRole = "user"): User {
  return {
    id,
    email: `${id}@atlas.test`,
    emailVerified: true,
    role,
    identities: [],
    profile: emptyProfile(),
    createdAt: new Date("2026-08-30T10:00:00Z"),
  };
}

function actor(role: UserRole = "super_admin"): PublicUser {
  return toPublicUser(user(SUPER_ID, role));
}

const hasher: PasswordHasherPort = {
  hash: (plain) => Promise.resolve(`hashed:${plain}`),
  verify: () => Promise.reject(new Error("verify is outside the path under test")),
};

describe("super-admin user management", () => {
  test("a super admin provisions a verified password user without creating a session", async () => {
    const { store, users } = inMemoryUserStore([]);
    const useCase = new CreateAdminUserUseCase(store, hasher);

    const created = await useCase.execute({
      actor: actor(),
      email: "  NEW@Atlas.Test ",
      password: "temporary password",
      role: "admin",
    });

    expect(created.email).toBe("new@atlas.test");
    expect(created.role).toBe("admin");
    expect(created.emailVerified).toBe(true);
    expect(users()[0]?.identities[0]?.secret).toBe("hashed:temporary password");
  });

  test("changing email updates the account and its password identity", async () => {
    const target = {
      ...user(TARGET_ID),
      identities: [
        { provider: "password" as const, providerUserId: TARGET_ID, email: "target@atlas.test" },
        {
          provider: "google" as const,
          providerUserId: "google-target",
          email: "provider@google.test",
        },
      ],
    };
    const { store, users } = inMemoryUserStore([target]);
    const useCase = new UpdateAdminUserEmailUseCase(store);

    await useCase.execute({ actor: actor(), targetUserId: TARGET_ID, email: "NEW@Atlas.Test" });

    expect(users()[0]?.email).toBe("new@atlas.test");
    expect(users()[0]?.identities[0]?.email).toBe("new@atlas.test");
    expect(users()[0]?.identities[1]?.email).toBe("provider@google.test");
  });

  test("changing email refuses an address already owned by someone else", async () => {
    const { store } = inMemoryUserStore([
      user(TARGET_ID),
      { ...user(makeUserId("other")), email: "used@atlas.test" },
    ]);
    const useCase = new UpdateAdminUserEmailUseCase(store);

    const attempt = useCase.execute({
      actor: actor(),
      targetUserId: TARGET_ID,
      email: "used@atlas.test",
    });

    await expect(attempt).rejects.toBeInstanceOf(EmailInUseError);
  });

  test("resetting a password adds the password identity to an OAuth-only account", async () => {
    const { store, users } = inMemoryUserStore([user(TARGET_ID)]);
    const useCase = new ResetAdminUserPasswordUseCase(store, hasher);

    await useCase.execute({ actor: actor(), targetUserId: TARGET_ID, password: "new password" });

    expect(users()[0]?.identities[0]).toMatchObject({
      provider: "password",
      email: "target@atlas.test",
      secret: "hashed:new password",
    });
  });
});

describe("destructive user management guards", () => {
  test("deletion removes owned data before the account", async () => {
    const { store, users } = inMemoryUserStore([user(TARGET_ID)]);
    const events: string[] = [];
    const ownedData: UserOwnedDataPort = {
      deleteUserOwnedData(id) {
        events.push(`data:${id}`);
        return Promise.resolve();
      },
    };
    const useCase = new DeleteAdminUserUseCase(store, ownedData);

    await useCase.execute({ actor: actor(), targetUserId: TARGET_ID });
    events.push(`remaining:${users().length}`);

    expect(events).toEqual(["data:target", "remaining:0"]);
  });

  for (const testCase of [
    {
      name: "a non-super-admin cannot delete users",
      actor: actor("admin"),
      target: user(TARGET_ID),
    },
    {
      name: "a super admin cannot delete themselves",
      actor: actor(),
      target: user(SUPER_ID, "super_admin"),
    },
    {
      name: "a super-admin account cannot be deleted",
      actor: actor(),
      target: user(TARGET_ID, "super_admin"),
    },
  ]) {
    test(testCase.name, async () => {
      const { store, users } = inMemoryUserStore([testCase.target]);
      const ownedData: UserOwnedDataPort = {
        deleteUserOwnedData: () => Promise.reject(new Error("guard did not run")),
      };
      const useCase = new DeleteAdminUserUseCase(store, ownedData);

      const attempt = useCase.execute({ actor: testCase.actor, targetUserId: testCase.target.id });

      await expect(attempt).rejects.toBeInstanceOf(RoleChangeForbiddenError);
      expect(users()).toHaveLength(1);
    });
  }
});
