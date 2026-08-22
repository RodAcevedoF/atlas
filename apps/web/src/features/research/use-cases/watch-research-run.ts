import type {
  ResearchRunRequestRecord,
  ResearchRunStatus,
  ResearchRunSummaryRecord,
} from "../repositories/research-repository.ts";

const IN_FLIGHT_STATUSES: readonly ResearchRunStatus[] = ["queued", "running"];

export function isResearchRunSettled(status: ResearchRunStatus): boolean {
  return !IN_FLIGHT_STATUSES.includes(status);
}

export function hasRunInFlight(runs: readonly ResearchRunSummaryRecord[]): boolean {
  return runs.some((run) => !isResearchRunSettled(run.status));
}

export interface WatchResearchRunOutcome {
  status: ResearchRunStatus;
  isStillRunning: boolean;
}

export type ResearchRunProgress = (status: ResearchRunStatus) => void;

export type WatchResearchRun = (
  requested: ResearchRunRequestRecord,
  onProgress: ResearchRunProgress,
) => Promise<WatchResearchRunOutcome>;
