import type {
  MarketRepository,
  WorldScanInput,
  WorldScanReportRecord,
} from "../repositories/market-repository.ts";

export interface RunWorldScanDeps {
  marketRepository: MarketRepository;
}

export type RunWorldScan = (input?: WorldScanInput) => Promise<WorldScanReportRecord>;

export function makeRunWorldScan({ marketRepository }: RunWorldScanDeps): RunWorldScan {
  return (input = {}) => marketRepository.runWorldScan(input);
}
