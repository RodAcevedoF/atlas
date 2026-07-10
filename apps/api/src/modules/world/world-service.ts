import type {
  ListWorldEventsInput,
  ListWorldEventsOutput,
  ListWorldEventsUseCase,
  ListWorldScanReportsUseCase,
  ListWorldTopicsInput,
  ListWorldTopicsOutput,
  ListWorldTopicsUseCase,
  WorldScanInput,
  WorldScanOutput,
  WorldScanReportFilter,
  WorldScanReportRecord,
  WorldScanUseCase,
} from "@atlas/application";
import type { IWorldService } from "./service.ts";

export class WorldService implements IWorldService {
  constructor(
    private readonly listWorldTopicsUseCase: ListWorldTopicsUseCase,
    private readonly listWorldEventsUseCase: ListWorldEventsUseCase,
    private readonly worldScanUseCase: WorldScanUseCase,
    private readonly listWorldScanReportsUseCase: ListWorldScanReportsUseCase,
  ) {}

  listWorldTopics(input: ListWorldTopicsInput = {}): Promise<ListWorldTopicsOutput> {
    return this.listWorldTopicsUseCase.execute(input);
  }

  listWorldEvents(input: ListWorldEventsInput = {}): Promise<ListWorldEventsOutput> {
    return this.listWorldEventsUseCase.execute(input);
  }

  runWorldScan(input: WorldScanInput = {}): Promise<WorldScanOutput> {
    return this.worldScanUseCase.execute(input);
  }

  listWorldScanReports(filter: WorldScanReportFilter = {}): Promise<WorldScanReportRecord[]> {
    return this.listWorldScanReportsUseCase.execute(filter);
  }
}
