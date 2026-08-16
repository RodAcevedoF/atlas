import type { ResearchRun, ResearchRunId } from "@atlas/domain";
import type {
  ClaimResearchRunInput,
  ResearchRunStorePort,
} from "../research/outbound/research-run-store.ts";
import { RESEARCH_MAX_ATTEMPTS } from "../research/outbound/research-run-store.ts";
import { UnsupportedPortMethodError } from "./unsupported-port-method.ts";

const FAKE = "inMemoryResearchRunStore";

export interface InMemoryResearchRunStore {
  store: ResearchRunStorePort;
  runs(): ResearchRun[];
}

function isClaimable(run: ResearchRun, input: ClaimResearchRunInput): boolean {
  if (run.status === "queued") return true;
  if (run.status === "running") {
    return run.startedAt !== null && run.startedAt < input.startedBefore;
  }
  if (run.status !== "failed_retryable") return false;
  if (run.attempts >= RESEARCH_MAX_ATTEMPTS) return false;
  return run.completedAt !== null && run.completedAt < input.completedBefore;
}

function newestFirst(left: ResearchRun, right: ResearchRun): number {
  return right.createdAt.getTime() - left.createdAt.getTime();
}

export function inMemoryResearchRunStore(seed: ResearchRun[] = []): InMemoryResearchRunStore {
  const held = new Map<ResearchRunId, ResearchRun>(seed.map((run) => [run.id, run]));

  const store: ResearchRunStorePort = {
    saveResearchRun(run) {
      if (held.has(run.id)) {
        return Promise.reject(new Error(`duplicate research run ${run.id}`));
      }
      held.set(run.id, run);
      return Promise.resolve();
    },
    findResearchRunById: (id) => Promise.resolve(held.get(id) ?? null),
    findResearchRunByQuestionDay(questionKey, day) {
      const [newest] = [...held.values()]
        .filter((run) => run.questionKey === questionKey && run.day === day)
        .sort(newestFirst);
      return Promise.resolve(newest ?? null);
    },
    countResearchRunsForDay(day) {
      return Promise.resolve([...held.values()].filter((run) => run.day === day).length);
    },
    claimNextResearchRun(input) {
      const [next] = [...held.values()]
        .filter((run) => isClaimable(run, input))
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
      if (!next) return Promise.resolve(null);

      const claimed: ResearchRun = {
        ...next,
        status: "running",
        startedAt: input.now,
        completedAt: null,
        error: null,
        attempts: next.attempts + 1,
      };
      held.set(claimed.id, claimed);
      return Promise.resolve(claimed);
    },
    completeResearchRun(input) {
      const run = held.get(input.id);
      if (!run) return Promise.reject(new Error(`unknown research run ${input.id}`));
      held.set(input.id, { ...run, ...input });
      return Promise.resolve();
    },
    listResearchRuns: () => {
      throw new UnsupportedPortMethodError(FAKE, "listResearchRuns");
    },
  };

  return { store, runs: () => [...held.values()] };
}
