import type { GrantableRole } from "@atlas/domain";
import type {
  AdminRepository,
  AdminUserPageRecord,
  CreateAdminUserInput,
} from "../repositories/admin-repository.ts";

export function makeLoadAdminUsers(repository: AdminRepository) {
  return (cursor?: string): Promise<AdminUserPageRecord> => repository.users(cursor);
}

export function makeCreateAdminUser(repository: AdminRepository) {
  return (input: CreateAdminUserInput): Promise<void> => repository.createUser(input);
}

export function makeUpdateAdminUserEmail(repository: AdminRepository) {
  return (id: string, email: string): Promise<void> => repository.updateUserEmail(id, email);
}

export function makeResetAdminUserPassword(repository: AdminRepository) {
  return (id: string, password: string): Promise<void> =>
    repository.resetUserPassword(id, password);
}

export function makeUpdateAdminUserRole(repository: AdminRepository) {
  return (id: string, role: GrantableRole): Promise<void> => repository.updateUserRole(id, role);
}

export function makeDeleteAdminUser(repository: AdminRepository) {
  return (id: string): Promise<void> => repository.deleteUser(id);
}
