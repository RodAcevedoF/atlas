import { afterEach, expect, test } from "bun:test";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { AdminProvider } from "../admin-provider.tsx";
import { MemoryAdminRepository } from "../testing/admin-repository.fake.ts";
import { useAdminUsers } from "./use-admin-users.ts";

afterEach(cleanup);

for (const targetId of ["self", "other"]) {
  test(`resetting ${targetId} reports success and handles session invalidation`, async () => {
    const repository = new MemoryAdminRepository(
      "self",
      ["self", "other"].map((id) => ({
        id,
        email: `${id}@atlas.test`,
        emailVerified: true,
        role: "super_admin",
        identityProviders: ["password"],
        createdAt: "2026-09-15T00:00:00.000Z",
      })),
    );
    let sessionStatus = "authenticated";
    let analyticsStatus = "unchanged";
    const { result } = renderHook(
      () =>
        useAdminUsers(
          () => {
            analyticsStatus = "refreshed";
          },
          "self",
          () => {
            sessionStatus = "anonymous";
          },
        ),
      {
        wrapper: ({ children }) => (
          <AdminProvider repository={repository}>{children}</AdminProvider>
        ),
      },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.resetPassword(targetId, "new password");
    });

    expect(repository.passwords.get(targetId)).toBe("new password");
    expect(result.current.error).toBeNull();
    expect(result.current.isSaving).toBe(false);
    expect(sessionStatus).toBe(targetId === "self" ? "anonymous" : "authenticated");
    expect(analyticsStatus).toBe(targetId === "self" ? "unchanged" : "refreshed");
  });
}
