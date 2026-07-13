import type { MarketStorePort } from "../ports/market-store.ts";
import type {
  ListWorldScanReports,
  WorldScanReportFilter,
  WorldScanReportRecord,
} from "./world-scan.ts";

export class ListWorldScanReportsUseCase implements ListWorldScanReports {
  constructor(private readonly store: MarketStorePort) {}

  execute(filter: WorldScanReportFilter = {}): Promise<WorldScanReportRecord[]> {
    return this.store.listWorldScanReports(filter);
  }
}
