import type { WorldScanReportFilter, WorldScanReportRecord } from "../inbound/world-scan.ts";

export interface WorldScanReportStorePort {
  saveWorldScanReport(record: WorldScanReportRecord): Promise<void>;
  listWorldScanReports(filter?: WorldScanReportFilter): Promise<WorldScanReportRecord[]>;
  listWorldScanReportsByIds(ids: string[]): Promise<WorldScanReportRecord[]>;
}
