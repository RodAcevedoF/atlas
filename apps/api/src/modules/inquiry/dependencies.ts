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
    listInquiryRuns: new ListInquiryRunsUseCase(deps.store),
    pollIntervalMs: deps.pollIntervalMs,
  };
}
