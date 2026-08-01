import type { SavedReportsRepository } from "../repositories/saved-reports-repository.ts";

export interface UnsaveReportDeps {
  savedReportsRepository: SavedReportsRepository;
}

export type UnsaveReport = (reportId: string) => Promise<void>;

export function makeUnsaveReport({ savedReportsRepository }: UnsaveReportDeps): UnsaveReport {
  return (reportId) => savedReportsRepository.unsave(reportId);
}
