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

export interface ResearchDeps {
  executeResearchRun: ExecuteResearchRun;
  requestResearchRun: RequestResearchRun;
  getResearchRun: GetResearchRun;
  listResearchRuns: ListResearchRuns;
  pollIntervalMs: number;
}

export function makeResearchDependencies(deps: {
  store: ResearchRunStorePort;
  orchestration: OrchestrationPort;
  retryAfterMs: number;
  runTimeoutMs: number;
  pollIntervalMs: number;
  dailyCap: number;
}): ResearchDeps {
  return {
    executeResearchRun: new ExecuteResearchRunUseCase(
      deps.store,
      deps.orchestration,
      deps.retryAfterMs,
      deps.runTimeoutMs,
    ),
    requestResearchRun: new RequestResearchRunUseCase(deps.store, deps.dailyCap),
    getResearchRun: new GetResearchRunUseCase(deps.store),
    listResearchRuns: new ListResearchRunsUseCase(deps.store),
    pollIntervalMs: deps.pollIntervalMs,
  };
}
