import type { WorldScanReportStorePort } from "../outbound/world-scan-report-store.ts";
import type {
  ListWorldScanReports,
  WorldScanReportFilter,
  WorldScanReportRecord,
} from "./world-scan.ts";

export class ListWorldScanReportsUseCase implements ListWorldScanReports {
  constructor(private readonly store: WorldScanReportStorePort) {}

  execute(filter: WorldScanReportFilter = {}): Promise<WorldScanReportRecord[]> {
    return this.store.listWorldScanReports(filter);
  }
}
