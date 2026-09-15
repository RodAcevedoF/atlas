import type { AdminRepository, AdminUserRecord } from "../repositories/admin-repository.ts";

export class MemoryAdminRepository implements AdminRepository {
  authenticated = true;
  passwords = new Map<string, string>();

  constructor(
    readonly currentUserId: string,
    readonly records: AdminUserRecord[],
  ) {}

  async users() {
    if (!this.authenticated) throw new Error("Authentication required");
    return { users: this.records, nextCursor: null };
  }

  async resetUserPassword(id: string, password: string) {
    if (!this.authenticated) throw new Error("Authentication required");
    if (!this.records.some((user) => user.id === id)) throw new Error("User not found");
    this.passwords.set(id, password);
    if (id === this.currentUserId) this.authenticated = false;
  }

  async analytics(): Promise<never> {
    throw new Error("Unexpected analytics");
  }

  async createUser(): Promise<never> {
    throw new Error("Unexpected createUser");
  }

  async updateUserEmail(): Promise<never> {
    throw new Error("Unexpected updateUserEmail");
  }

  async updateUserRole(): Promise<never> {
    throw new Error("Unexpected updateUserRole");
  }

  async deleteUser(): Promise<never> {
    throw new Error("Unexpected deleteUser");
  }
}
