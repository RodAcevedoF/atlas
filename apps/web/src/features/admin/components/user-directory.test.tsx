import { afterEach, expect, test } from "bun:test";
import { type PublicUser, makeUserId } from "@atlas/domain";
import { ToastProvider } from "@atlas/ui";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseAdminUsersResult } from "../hooks/use-admin-users.ts";
import type { AdminUserRecord } from "../repositories/admin-repository.ts";
import { UserDirectory } from "./user-directory.tsx";

afterEach(cleanup);

const CURRENT_USER: PublicUser = {
  id: makeUserId("admin-1"),
  email: "admin@example.com",
  emailVerified: true,
  role: "admin",
  profile: { preferredRegions: [], preferredTopics: [] },
};

const LISTED_USER: AdminUserRecord = {
  id: "user-1",
  email: "person@example.com",
  emailVerified: true,
  role: "user",
  identityProviders: ["password"],
  createdAt: "2026-08-31T10:00:00.000Z",
};

function unexpectedAction(): Promise<never> {
  return Promise.reject(new Error("Unexpected directory action"));
}

function makeDirectory(overrides: Partial<UseAdminUsersResult> = {}): UseAdminUsersResult {
  return {
    users: [],
    nextCursor: null,
    isLoading: false,
    isSaving: false,
    error: null,
    loadMore: unexpectedAction,
    create: unexpectedAction,
    updateEmail: unexpectedAction,
    resetPassword: unexpectedAction,
    updateRole: unexpectedAction,
    remove: unexpectedAction,
    ...overrides,
  };
}

function renderDirectory(directory: UseAdminUsersResult) {
  return render(
    <ToastProvider>
      <UserDirectory currentUser={CURRENT_USER} directory={directory} />
    </ToastProvider>,
  );
}

test("the directory distinguishes its initial load from an empty result", () => {
  const view = renderDirectory(makeDirectory({ isLoading: true }));

  expect(screen.getByRole("status").textContent).toBe("Loading users…");
  expect(screen.queryByText("No users found.")).toBeNull();

  view.rerender(
    <ToastProvider>
      <UserDirectory currentUser={CURRENT_USER} directory={makeDirectory()} />
    </ToastProvider>,
  );

  expect(screen.getByRole("status").textContent).toBe("No users found.");
});

test("loading another page keeps existing users visible and replaces the load-more action", () => {
  renderDirectory(
    makeDirectory({ users: [LISTED_USER], nextCursor: "next-page", isLoading: true }),
  );

  expect(screen.getAllByText("person@example.com")).toHaveLength(2);
  expect(screen.getByText("Loading more users…")).toBeDefined();
  expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
});

test("an empty directory failure is rendered once as an alert", () => {
  renderDirectory(makeDirectory({ error: "Could not load users" }));

  expect(screen.getByRole("alert").textContent).toBe("Could not load users");
  expect(screen.getAllByText("Could not load users")).toHaveLength(1);
});
