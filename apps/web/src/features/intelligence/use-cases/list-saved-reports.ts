import type { WorldScanHistoryItem } from "@/features/world-awareness/repositories/market-repository.ts";
import type { SavedReportsRepository } from "../repositories/saved-reports-repository.ts";

export interface ListSavedReportsDeps {
  savedReportsRepository: SavedReportsRepository;
}

export type ListSavedReports = () => Promise<WorldScanHistoryItem[]>;

export function makeListSavedReports({
  savedReportsRepository,
}: ListSavedReportsDeps): ListSavedReports {
  return () => savedReportsRepository.list();
}
