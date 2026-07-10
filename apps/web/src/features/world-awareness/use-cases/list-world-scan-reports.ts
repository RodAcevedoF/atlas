import type {
  MarketRepository,
  WorldScanHistoryFilter,
  WorldScanHistoryItem,
} from "../repositories/market-repository.ts";

export function listWorldScanReports(
  repository: MarketRepository,
  filter: WorldScanHistoryFilter = {},
): Promise<WorldScanHistoryItem[]> {
  return repository.listWorldScanReports(filter);
}
