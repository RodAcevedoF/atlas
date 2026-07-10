import type {
  ListWorldEventsInput,
  ListWorldEventsOutput,
  ListWorldTopicsInput,
  ListWorldTopicsOutput,
  WorldScanInput,
  WorldScanOutput,
  WorldScanReportFilter,
  WorldScanReportRecord,
} from "@atlas/application";

export interface IWorldService {
  listWorldTopics(input?: ListWorldTopicsInput): Promise<ListWorldTopicsOutput>;
  listWorldEvents(input?: ListWorldEventsInput): Promise<ListWorldEventsOutput>;
  runWorldScan(input?: WorldScanInput): Promise<WorldScanOutput>;
  listWorldScanReports(filter?: WorldScanReportFilter): Promise<WorldScanReportRecord[]>;
}
