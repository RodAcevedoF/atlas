import type {
  ExecuteResearchRun,
  OrchestrationPort,
  ResearchRunStorePort,
} from "@atlas/application";
import { ExecuteResearchRunUseCase } from "@atlas/application";

export interface ResearchDeps {
  executeResearchRun: ExecuteResearchRun;
  pollIntervalMs: number;
}

export function makeResearchDependencies(deps: {
  store: ResearchRunStorePort;
  orchestration: OrchestrationPort;
  retryAfterMs: number;
  runTimeoutMs: number;
  pollIntervalMs: number;
}): ResearchDeps {
  return {
    executeResearchRun: new ExecuteResearchRunUseCase(
      deps.store,
      deps.orchestration,
      deps.retryAfterMs,
      deps.runTimeoutMs,
    ),
    pollIntervalMs: deps.pollIntervalMs,
  };
}
