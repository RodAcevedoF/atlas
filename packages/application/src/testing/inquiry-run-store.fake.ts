import type { InquiryRun, InquiryRunId, InquiryRunListRow } from "@atlas/domain";
import type {
  ClaimInquiryRunInput,
  InquiryRunStorePort,
} from "../inquiry/outbound/inquiry-run-store.ts";
import { INQUIRY_MAX_ATTEMPTS } from "../inquiry/outbound/inquiry-run-store.ts";

export interface InMemoryInquiryRunStore {
  store: InquiryRunStorePort;
  runs(): InquiryRun[];
}

function isClaimable(run: InquiryRun, input: ClaimInquiryRunInput): boolean {
  if (run.status === "queued") return true;
  if (run.status === "running") {
    return run.startedAt !== null && run.startedAt < input.startedBefore;
  }
  if (run.status !== "failed_retryable") return false;
  if (run.attempts >= INQUIRY_MAX_ATTEMPTS) return false;
  return run.completedAt !== null && run.completedAt < input.completedBefore;
}

function toListRow(run: InquiryRun): InquiryRunListRow {
  return {
    id: run.id,
    question: run.question,
    day: run.day,
    window: run.window,
    placeCount: run.places.length,
    status: run.status,
    createdAt: run.createdAt,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
  };
}

function newestFirst(left: InquiryRun, right: InquiryRun): number {
  return right.createdAt.getTime() - left.createdAt.getTime();
}

export function inMemoryInquiryRunStore(seed: InquiryRun[] = []): InMemoryInquiryRunStore {
  const held = new Map<InquiryRunId, InquiryRun>(seed.map((run) => [run.id, run]));

  const store: InquiryRunStorePort = {
    saveInquiryRun(run) {
      if (held.has(run.id)) {
        return Promise.reject(new Error(`duplicate inquiry run ${run.id}`));
      }
      held.set(run.id, run);
      return Promise.resolve();
    },
    findInquiryRunById: (id) => Promise.resolve(held.get(id) ?? null),
    findInquiryRunByQuestionDay(questionKey, day) {
      const [newest] = [...held.values()]
        .filter((run) => run.questionKey === questionKey && run.day === day)
        .sort(newestFirst);
      return Promise.resolve(newest ?? null);
    },
    countInquiryRunsForDay(day) {
      return Promise.resolve([...held.values()].filter((run) => run.day === day).length);
    },
    claimNextInquiryRun(input) {
      const [next] = [...held.values()].filter((run) => isClaimable(run, input)).sort(newestFirst);
      if (!next) return Promise.resolve(null);

      const claimed: InquiryRun = {
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
    completeInquiryRun(input) {
      const run = held.get(input.id);
      if (!run) return Promise.reject(new Error(`unknown inquiry run ${input.id}`));
      held.set(input.id, { ...run, ...input });
      return Promise.resolve();
    },
    listInquiryRuns(page) {
      return Promise.resolve(
        [...held.values()].sort(newestFirst).slice(0, page.limit).map(toListRow),
      );
    },
  };

  return { store, runs: () => [...held.values()] };
}
