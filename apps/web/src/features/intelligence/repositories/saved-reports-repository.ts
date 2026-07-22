import type { WorldScanHistoryItem } from "@/features/world-awareness/repositories/market-repository.ts";

export interface SavedReportsRepository {
  list(): Promise<WorldScanHistoryItem[]>;
  save(reportId: string): Promise<void>;
  unsave(reportId: string): Promise<void>;
}
