import type { GeoRegion, Topic } from "@atlas/domain";

export interface WorldScanInput {
  since?: Date;
  topic?: Topic;
  region?: GeoRegion;
}

export interface WorldScanDevelopment {
  title: string;
  where: string;
  whyItMatters: string;
  citations: string[];
}

export interface WorldScanDivergence {
  topic: string;
  region: string;
  attention: string;
  expectation: string;
  read: string;
  citations: string[];
}

export interface WorldScanRegionNote {
  region: string;
  note: string;
}

export interface WorldScanCoverage {
  sourcesUsed: string[];
  gaps: string[];
  note: string;
}

export interface WorldScanNarrative {
  developments: WorldScanDevelopment[];
  divergences: WorldScanDivergence[];
  regionNotes: WorldScanRegionNote[];
  coverage: WorldScanCoverage;
}

export interface WorldScanHeader {
  windowSince: string | null;
  generatedAt: string;
  newsSignalCount: number;
  marketMoverCount: number;
  topMovers: string[];
}

export interface WorldScanReport extends WorldScanNarrative {
  header: WorldScanHeader;
}

export type WorldScanOutput = WorldScanReport;

export interface WorldScanReportRecord {
  id: string;
  generatedAt: string;
  scope: WorldScanInput;
  report: WorldScanReport;
}

export interface WorldScanReportFilter {
  topic?: Topic;
  region?: GeoRegion;
  limit?: number;
}

export interface WorldScan {
  execute(input?: WorldScanInput): Promise<WorldScanOutput>;
}

export interface ListWorldScanReports {
  execute(filter?: WorldScanReportFilter): Promise<WorldScanReportRecord[]>;
}
