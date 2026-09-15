import { afterEach, expect, test } from "bun:test";
import { ToastProvider } from "@atlas/ui";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AdminUserRecord } from "../repositories/admin-repository.ts";
import { MemoryAdminRepository } from "../testing/admin-repository.fake.ts";
import { UserDetailPanel } from "./user-detail-panel.tsx";

afterEach(cleanup);

test("password confirmation blocks mismatches and clears both fields after a successful reset", async () => {
  const user: AdminUserRecord = {
    id: "other",
    email: "other@atlas.test",
    emailVerified: true,
    role: "user",
    identityProviders: ["password"],
    createdAt: "2026-09-15T00:00:00.000Z",
  };
  const repository = new MemoryAdminRepository("self", [user]);
  render(
    <ToastProvider>
      <UserDetailPanel
        user={user}
        currentUserId="self"
        canManage={true}
        isSaving={false}
        onResetPassword={(id, password) => repository.resetUserPassword(id, password)}
        onUpdateEmail={() => repository.updateUserEmail()}
        onUpdateRole={() => repository.updateUserRole()}
        onDelete={() => repository.deleteUser()}
      />
    </ToastProvider>,
  );
  const password = screen.getByLabelText<HTMLInputElement>("Set password");
  const confirmation = screen.getByLabelText<HTMLInputElement>("Confirm password");
  const submit = screen.getByRole<HTMLButtonElement>("button", { name: "Set" });
  const form = password.closest("form");
  if (!form) throw new Error("Password form missing");

  fireEvent.change(password, { target: { value: "new password" } });
  fireEvent.change(confirmation, { target: { value: "different password" } });
  fireEvent.submit(form);

  expect(submit.disabled).toBe(true);
  expect(repository.passwords.has(user.id)).toBe(false);
  expect(screen.getAllByText("Passwords do not match.").length).toBeGreaterThan(0);

  fireEvent.change(confirmation, { target: { value: "new password" } });
  expect(submit.disabled).toBe(false);
  fireEvent.click(submit);

  await waitFor(() => expect(password.value).toBe(""));
  expect(confirmation.value).toBe("");
  expect(repository.passwords.get(user.id)).toBe("new password");
  expect(screen.getByText("Password set.")).toBeDefined();
});
