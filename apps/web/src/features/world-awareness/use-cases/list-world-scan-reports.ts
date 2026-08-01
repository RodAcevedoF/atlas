import type {
  MarketRepository,
  WorldScanHistoryFilter,
  WorldScanHistoryItem,
} from "../repositories/market-repository.ts";

export interface ListWorldScanReportsDeps {
  marketRepository: MarketRepository;
}

export type ListWorldScanReports = (
  filter?: WorldScanHistoryFilter,
) => Promise<WorldScanHistoryItem[]>;

export function makeListWorldScanReports({
  marketRepository,
}: ListWorldScanReportsDeps): ListWorldScanReports {
  return (filter = {}) => marketRepository.listWorldScanReports(filter);
}
