import { expect, test } from "bun:test";
import type { User } from "@atlas/domain";
import { emptyProfile, makeUserId } from "@atlas/domain";
import { inMemoryUserStore } from "../../testing/user-store.fake.ts";
import { ListAdminUsersUseCase } from "./list-admin-users.ts";

function user(id: string, createdAt: Date, withSecret = false): User {
  return {
    id: makeUserId(id),
    email: `${id}@atlas.test`,
    emailVerified: true,
    role: "user",
    identities: [
      {
        provider: "password",
        providerUserId: id,
        email: `${id}@atlas.test`,
        secret: withSecret ? "never-return-this" : undefined,
      },
    ],
    profile: emptyProfile(),
    createdAt,
  };
}

test("the admin directory is bounded, cursor-paginated, and never exposes identity secrets", async () => {
  const { store } = inMemoryUserStore([
    user("old", new Date("2026-08-28T10:00:00Z")),
    user("middle", new Date("2026-08-29T10:00:00Z"), true),
    user("new", new Date("2026-08-30T10:00:00Z")),
  ]);
  const useCase = new ListAdminUsersUseCase(store);

  const first = await useCase.execute({ limit: 2 });
  const second = await useCase.execute({ limit: 2, cursor: first.nextCursor ?? undefined });

  expect(first.users.map((entry) => entry.id)).toEqual(["new", "middle"]);
  expect(first.nextCursor).toBe("middle");
  expect(first.users[1]).toEqual({
    id: "middle",
    email: "middle@atlas.test",
    emailVerified: true,
    role: "user",
    identityProviders: ["password"],
    createdAt: new Date("2026-08-29T10:00:00Z"),
  });
  expect(second.users.map((entry) => entry.id)).toEqual(["old"]);
  expect(second.nextCursor).toBeNull();
});
