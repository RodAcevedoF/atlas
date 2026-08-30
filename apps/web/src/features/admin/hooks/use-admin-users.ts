import type { GrantableRole } from "@atlas/domain";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminRepository } from "../admin-provider.tsx";
import type { AdminUserRecord, CreateAdminUserInput } from "../repositories/admin-repository.ts";
import {
  makeCreateAdminUser,
  makeDeleteAdminUser,
  makeLoadAdminUsers,
  makeResetAdminUserPassword,
  makeUpdateAdminUserEmail,
  makeUpdateAdminUserRole,
} from "../use-cases/manage-admin-users.ts";

export interface UseAdminUsersResult {
  users: AdminUserRecord[];
  nextCursor: string | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  create: (input: CreateAdminUserInput) => Promise<void>;
  updateEmail: (id: string, email: string) => Promise<void>;
  resetPassword: (id: string, password: string) => Promise<void>;
  updateRole: (id: string, role: GrantableRole) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : "Could not load users";
}

export function useAdminUsers(onChanged: () => void): UseAdminUsersResult {
  const repository = useAdminRepository();
  const actions = useMemo(
    () => ({
      load: makeLoadAdminUsers(repository),
      create: makeCreateAdminUser(repository),
      updateEmail: makeUpdateAdminUserEmail(repository),
      resetPassword: makeResetAdminUserPassword(repository),
      updateRole: makeUpdateAdminUserRole(repository),
      remove: makeDeleteAdminUser(repository),
    }),
    [repository],
  );
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFirstPage = useCallback(async () => {
    const page = await actions.load();
    setUsers(page.users);
    setNextCursor(page.nextCursor);
  }, [actions]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    void actions
      .load()
      .then((page) => {
        if (cancelled) return;
        setUsers(page.users);
        setNextCursor(page.nextCursor);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(errorMessage(cause));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [actions]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoading) return;
    setIsLoading(true);
    try {
      const page = await actions.load(nextCursor);
      setUsers((current) => [...current, ...page.users]);
      setNextCursor(page.nextCursor);
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setIsLoading(false);
    }
  }, [actions, isLoading, nextCursor]);

  const mutate = useCallback(
    async (operation: () => Promise<void>) => {
      setIsSaving(true);
      try {
        await operation();
        await loadFirstPage();
        setError(null);
        onChanged();
      } catch (cause) {
        setError(errorMessage(cause));
        throw cause;
      } finally {
        setIsSaving(false);
      }
    },
    [loadFirstPage, onChanged],
  );

  const create = useCallback(
    (input: CreateAdminUserInput) => mutate(() => actions.create(input)),
    [actions, mutate],
  );
  const updateEmail = useCallback(
    (id: string, email: string) => mutate(() => actions.updateEmail(id, email)),
    [actions, mutate],
  );
  const resetPassword = useCallback(
    (id: string, password: string) => mutate(() => actions.resetPassword(id, password)),
    [actions, mutate],
  );
  const updateRole = useCallback(
    (id: string, role: GrantableRole) => mutate(() => actions.updateRole(id, role)),
    [actions, mutate],
  );
  const remove = useCallback((id: string) => mutate(() => actions.remove(id)), [actions, mutate]);

  return {
    users,
    nextCursor,
    isLoading,
    isSaving,
    error,
    loadMore,
    create,
    updateEmail,
    resetPassword,
    updateRole,
    remove,
  };
}
