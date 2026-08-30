import { fetchJson } from "@/shared/http.ts";
import { fetchNoContent } from "@/shared/http.ts";
import type { GrantableRole } from "@atlas/domain";
import type {
  AdminAnalyticsRecord,
  AdminRepository,
  AdminUserPageRecord,
  CreateAdminUserInput,
} from "./admin-repository.ts";

export class HttpAdminRepository implements AdminRepository {
  analytics(): Promise<AdminAnalyticsRecord> {
    return fetchJson<AdminAnalyticsRecord>("/api/admin/analytics");
  }

  users(cursor?: string): Promise<AdminUserPageRecord> {
    const query = new URLSearchParams({ limit: "25" });
    if (cursor) query.set("cursor", cursor);
    return fetchJson<AdminUserPageRecord>(`/api/admin/users?${query.toString()}`);
  }

  async createUser(input: CreateAdminUserInput): Promise<void> {
    await fetchJson("/api/users", this.json("POST", input));
  }

  updateUserEmail(id: string, email: string): Promise<void> {
    return fetchNoContent(
      `/api/users/${encodeURIComponent(id)}/email`,
      this.json("PATCH", { email }),
    );
  }

  resetUserPassword(id: string, password: string): Promise<void> {
    return fetchNoContent(
      `/api/users/${encodeURIComponent(id)}/password`,
      this.json("PUT", { password }),
    );
  }

  async updateUserRole(id: string, role: GrantableRole): Promise<void> {
    await fetchJson(`/api/users/${encodeURIComponent(id)}/role`, this.json("PUT", { role }));
  }

  deleteUser(id: string): Promise<void> {
    return fetchNoContent(`/api/users/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  private json(method: string, body: unknown): RequestInit {
    return {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    };
  }
}
