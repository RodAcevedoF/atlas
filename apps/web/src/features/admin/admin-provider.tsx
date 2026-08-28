import type { AdminRepository } from "@/features/admin/repositories/admin-repository.ts";
import { type PropsWithChildren, createContext, useContext } from "react";

const AdminRepositoryContext = createContext<AdminRepository | null>(null);

export function AdminProvider({
  repository,
  children,
}: PropsWithChildren<{ repository: AdminRepository }>) {
  return (
    <AdminRepositoryContext.Provider value={repository}>{children}</AdminRepositoryContext.Provider>
  );
}

export function useAdminRepository(): AdminRepository {
  const repository = useContext(AdminRepositoryContext);
  if (!repository) throw new Error("AdminRepository is not available");
  return repository;
}
