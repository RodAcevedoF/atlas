import type {
  MarketRepository,
  WorldScanInput,
  WorldScanReportRecord,
} from "../repositories/market-repository.ts";

export function runWorldScan(
  repository: MarketRepository,
  input: WorldScanInput = {},
): Promise<WorldScanReportRecord> {
  return repository.runWorldScan(input);
}
