import type {
  ExecuteResearchRun,
  GetResearchRun,
  ListResearchRuns,
  OrchestrationPort,
  RequestResearchRun,
  ResearchRunStorePort,
} from "@atlas/application";
import {
  ExecuteResearchRunUseCase,
  GetResearchRunUseCase,
  ListResearchRunsUseCase,
  RequestResearchRunUseCase,
} from "@atlas/application";

export interface InquiryDeps {
  executeInquiryRun: ExecuteResearchRun;
  requestInquiryRun: RequestResearchRun;
  getInquiryRun: GetResearchRun;
  listInquiryRuns: ListResearchRuns;
  pollIntervalMs: number;
}

export function makeInquiryDependencies(deps: {
  store: ResearchRunStorePort;
  orchestration: OrchestrationPort;
  retryAfterMs: number;
  runTimeoutMs: number;
  pollIntervalMs: number;
  dailyCap: number;
}): InquiryDeps {
  return {
    executeInquiryRun: new ExecuteResearchRunUseCase(
      deps.store,
      deps.orchestration,
      deps.retryAfterMs,
      deps.runTimeoutMs,
    ),
    requestInquiryRun: new RequestResearchRunUseCase(deps.store, deps.dailyCap),
    getInquiryRun: new GetResearchRunUseCase(deps.store),
    listInquiryRuns: new ListResearchRunsUseCase(deps.store),
    pollIntervalMs: deps.pollIntervalMs,
  };
}
