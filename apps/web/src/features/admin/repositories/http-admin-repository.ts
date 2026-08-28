import { fetchJson } from "@/shared/http.ts";
import type { AdminAnalyticsRecord, AdminRepository } from "./admin-repository.ts";

export class HttpAdminRepository implements AdminRepository {
  analytics(): Promise<AdminAnalyticsRecord> {
    return fetchJson<AdminAnalyticsRecord>("/api/admin/analytics");
  }
}
