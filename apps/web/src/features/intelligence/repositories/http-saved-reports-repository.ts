import type { WorldScanHistoryItem } from "@/features/world-awareness/repositories/market-repository.ts";
import { fetchJson } from "@/shared/http.ts";
import type { SavedReportsRepository } from "./saved-reports-repository.ts";

function reportPath(reportId: string): string {
  return `/api/profile/reports/${encodeURIComponent(reportId)}`;
}

export class HttpSavedReportsRepository implements SavedReportsRepository {
  async list(): Promise<WorldScanHistoryItem[]> {
    const { reports } = await fetchJson<{ reports: WorldScanHistoryItem[] }>(
      "/api/profile/reports",
    );
    return reports;
  }

  async save(reportId: string): Promise<void> {
    await fetchJson(reportPath(reportId), { method: "POST" });
  }

  async unsave(reportId: string): Promise<void> {
    await fetchJson(reportPath(reportId), { method: "DELETE" });
  }
}
