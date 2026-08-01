import type { SavedReportsRepository } from "../repositories/saved-reports-repository.ts";

export interface SaveReportDeps {
  savedReportsRepository: SavedReportsRepository;
}

export type SaveReport = (reportId: string) => Promise<void>;

export function makeSaveReport({ savedReportsRepository }: SaveReportDeps): SaveReport {
  return (reportId) => savedReportsRepository.save(reportId);
}
