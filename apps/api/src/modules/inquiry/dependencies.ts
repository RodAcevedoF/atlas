import type {
  ExecuteInquiryRun,
  GetInquiryRun,
  InquiryRunStorePort,
  ListInquiryRuns,
  OrchestrationPort,
  RequestInquiryRun,
} from "@atlas/application";
import {
  ExecuteInquiryRunUseCase,
  GetInquiryRunUseCase,
  ListInquiryRunsUseCase,
  RequestInquiryRunUseCase,
} from "@atlas/application";
import type { InquiryRunId } from "@atlas/domain";

export interface InquiryDeps {
  executeInquiryRun: ExecuteInquiryRun;
  requestInquiryRun: RequestInquiryRun;
  getInquiryRun: GetInquiryRun;
  listInquiryRuns: ListInquiryRuns;
  pollIntervalMs: number;
}

export function makeInquiryDependencies(deps: {
  store: InquiryRunStorePort;
  orchestration: OrchestrationPort;
  retryAfterMs: number;
  runTimeoutMs: number;
  pollIntervalMs: number;
  dailyCap: number;
  pinnedRunId: InquiryRunId | null;
}): InquiryDeps {
  return {
    executeInquiryRun: new ExecuteInquiryRunUseCase(
      deps.store,
      deps.orchestration,
      deps.retryAfterMs,
      deps.runTimeoutMs,
    ),
    requestInquiryRun: new RequestInquiryRunUseCase(deps.store, deps.dailyCap),
    getInquiryRun: new GetInquiryRunUseCase(deps.store),
    listInquiryRuns: new ListInquiryRunsUseCase(deps.store, deps.pinnedRunId),
    pollIntervalMs: deps.pollIntervalMs,
  };
}
