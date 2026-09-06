import type {
  InquiryPlace,
  InquiryRun,
  InquiryRunId,
  InquiryRunListRow,
  InquiryRunStatus,
} from "@atlas/domain";
import { inquiryProgressRank } from "@atlas/domain";
import type {
  ClaimInquiryRunInput,
  InquiryRunCheckpoint,
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
    ownerId: run.ownerId,
    question: run.question,
    day: run.day,
    window: run.window,
    placeCount: run.places.length,
    status: run.status,
    revision: run.progress.revision,
    createdAt: run.createdAt,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
  };
}

function newestFirst(left: InquiryRun, right: InquiryRun): number {
  return right.createdAt.getTime() - left.createdAt.getTime();
}

function isFreshCheckpoint(
  held: { attempt: number; sequence: number } | undefined,
  checkpoint: InquiryRunCheckpoint,
): boolean {
  if (!held) return true;
  if (held.attempt !== checkpoint.attempt) return held.attempt < checkpoint.attempt;
  return held.sequence < checkpoint.sequence;
}

function withPlaceRead(
  places: InquiryPlace[],
  checkpoint: Extract<InquiryRunCheckpoint, { stage: "place_read_ready" }>,
): InquiryPlace[] {
  return places.map((place) =>
    place.latitude === checkpoint.latitude && place.longitude === checkpoint.longitude
      ? { ...place, read: checkpoint.read }
      : place,
  );
}

function checkpointed(run: InquiryRun, checkpoint: InquiryRunCheckpoint): Partial<InquiryRun> {
  if (checkpoint.stage === "retrieval_complete") {
    return {
      documents: checkpoint.documents,
      claimCount: checkpoint.claimCount,
      costUsd: checkpoint.costUsd,
    };
  }
  if (checkpoint.stage === "map_ready") {
    return {
      places: checkpoint.places,
      claimCount: checkpoint.claimCount,
      unplacedClaims: checkpoint.unplacedClaims,
    };
  }
  if (checkpoint.stage === "synthesis_ready") return { synthesis: checkpoint.synthesis };
  return { places: withPlaceRead(run.places, checkpoint) };
}

export function inMemoryInquiryRunStore(seed: InquiryRun[] = []): InMemoryInquiryRunStore {
  const held = new Map<InquiryRunId, InquiryRun>(seed.map((run) => [run.id, run]));
  const cursors = new Map<InquiryRunId, { attempt: number; sequence: number }>();
  const notified = new Map<InquiryRunId, number>();

  function claim(run: InquiryRun, input: ClaimInquiryRunInput): InquiryRun {
    const claimed: InquiryRun = {
      ...run,
      status: "running",
      startedAt: input.now,
      completedAt: null,
      failure: null,
      error: null,
      attempts: run.attempts + 1,
      progress: { stage: "queued", revision: run.progress.revision + 1, updatedAt: input.now },
    };
    held.set(claimed.id, claimed);
    return claimed;
  }

  const store: InquiryRunStorePort = {
    saveInquiryRun(run) {
      if (held.has(run.id)) {
        return Promise.reject(new Error(`duplicate inquiry run ${run.id}`));
      }
      held.set(run.id, run);
      return Promise.resolve();
    },
    findInquiryRunById: (id) => Promise.resolve(held.get(id) ?? null),
    findInquiryRunListRowById(id) {
      const run = held.get(id);
      return Promise.resolve(run ? toListRow(run) : null);
    },
    findInquiryRunByQuestionDay(ownerId, questionKey, day) {
      const [newest] = [...held.values()]
        .filter(
          (run) => run.ownerId === ownerId && run.questionKey === questionKey && run.day === day,
        )
        .sort(newestFirst);
      return Promise.resolve(newest ?? null);
    },
    countSucceededQuestionsForOwnerDay(ownerId, day) {
      const keys = new Set(
        [...held.values()]
          .filter((run) => run.ownerId === ownerId && run.day === day && run.status === "succeeded")
          .map((run) => run.questionKey),
      );
      return Promise.resolve(keys.size);
    },
    claimNextInquiryRun(input) {
      const [next] = [...held.values()].filter((run) => isClaimable(run, input)).sort(newestFirst);
      return Promise.resolve(next ? claim(next, input) : null);
    },
    claimInquiryRunById(id, input) {
      const run = held.get(id);
      if (!run || !isClaimable(run, input)) return Promise.resolve(null);
      return Promise.resolve(claim(run, input));
    },
    deleteInquiryRunById: (id) => Promise.resolve(held.delete(id)),
    completeInquiryRun(input) {
      const run = held.get(input.id);
      if (!run) return Promise.reject(new Error(`unknown inquiry run ${input.id}`));
      const revision = run.progress.revision + 1;
      held.set(input.id, {
        ...run,
        ...input,
        progress: { stage: "terminal", revision, updatedAt: input.completedAt },
      });
      return Promise.resolve(revision);
    },
    applyInquiryRunCheckpoint(checkpoint) {
      const run = held.get(checkpoint.id);
      if (!run) return Promise.reject(new Error(`unknown inquiry run ${checkpoint.id}`));
      if (run.completedAt !== null) return Promise.resolve(null);
      if (!isFreshCheckpoint(cursors.get(checkpoint.id), checkpoint)) return Promise.resolve(null);

      const reached =
        inquiryProgressRank(checkpoint.stage) > inquiryProgressRank(run.progress.stage)
          ? checkpoint.stage
          : run.progress.stage;
      const revision = run.progress.revision + 1;
      cursors.set(checkpoint.id, { attempt: checkpoint.attempt, sequence: checkpoint.sequence });
      held.set(checkpoint.id, {
        ...run,
        ...checkpointed(run, checkpoint),
        progress: { stage: reached, revision, updatedAt: checkpoint.occurredAt },
      });
      return Promise.resolve(revision);
    },
    confirmInquiryRunNotification(notification) {
      const confirmed = notified.get(notification.runId) ?? 0;
      notified.set(notification.runId, Math.max(confirmed, notification.revision));
      return Promise.resolve();
    },
    findUnnotifiedInquiryRuns(query) {
      const stranded = [...held.values()]
        .filter((run) => run.progress.updatedAt > query.updatedAfter)
        .filter((run) => run.progress.revision > (notified.get(run.id) ?? 0))
        .slice(0, query.limit)
        .map((run) => ({ runId: run.id, revision: run.progress.revision }));
      return Promise.resolve(stranded);
    },
    listInquiryRuns(page) {
      return Promise.resolve(
        [...held.values()]
          .filter((run) => page.ownerId === null || run.ownerId === page.ownerId)
          .sort(newestFirst)
          .slice(0, page.limit)
          .map(toListRow),
      );
    },
    summarizeInquiryRuns(day) {
      const runs = [...held.values()];
      const byStatus: Partial<Record<InquiryRunStatus, number>> = {};
      let retrievalCostUsd = 0;
      let today = 0;
      for (const run of runs) {
        byStatus[run.status] = (byStatus[run.status] ?? 0) + 1;
        retrievalCostUsd += run.costUsd;
        if (run.day === day) today += 1;
      }
      return Promise.resolve({
        total: runs.length,
        today,
        byStatus,
        retrievalCostUsd,
      });
    },
  };

  return { store, runs: () => [...held.values()] };
}
