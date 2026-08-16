import type {
  ExecuteResearchRun,
  OrchestrationPort,
  RequestResearchRun,
  ResearchRunStorePort,
} from "@atlas/application";
import { ExecuteResearchRunUseCase, RequestResearchRunUseCase } from "@atlas/application";

export interface ResearchDeps {
  executeResearchRun: ExecuteResearchRun;
  requestResearchRun: RequestResearchRun;
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
    pollIntervalMs: deps.pollIntervalMs,
  };
}
