import type {
  FailedInquiryStatus,
  InquiryDegradation,
  InquiryFailureKind,
  InquiryRun,
  InquiryRunId,
  InquiryRunStatus,
} from "@atlas/domain";
import { isFailedInquiryStatus } from "@atlas/domain";
import type { OrchestrationPort } from "../../world/outbound/orchestration.ts";
import { GraphUnavailableError, GraphUnreadableError } from "../../world/outbound/orchestration.ts";
import type { InquiryRunEnvelope } from "../../world/outbound/run-envelope.ts";
import { isRunEnvelope, isTerminalRunEnvelope } from "../../world/outbound/run-envelope.ts";
import type { InquiryRunNotifierPort } from "../outbound/inquiry-run-notifier.ts";
import type {
  CompleteInquiryRunInput,
  InquiryRunStorePort,
} from "../outbound/inquiry-run-store.ts";
import { INQUIRY_MAX_ATTEMPTS } from "../outbound/inquiry-run-store.ts";
import {
  asCount,
  asDocuments,
  asPlaces,
  asText,
  isTerminalStatus,
} from "./inquiry-graph-payload.ts";
import type { PreservedArtifacts } from "./inquiry-run-checkpoint.ts";
import { toCheckpoint, withCheckpoint } from "./inquiry-run-checkpoint.ts";
import { notifyInquiryRun } from "./inquiry-run-notification.ts";

const GRAPH_NAME = "inquiry";
const ERROR_SAMPLE_CHARS = 2000;
export const STALE_TIMEOUT_MULTIPLE = 2;

export interface ExecuteInquiryRunOutput {
  runId: InquiryRunId | null;
  status: InquiryRunStatus | null;
}

export interface ExecuteInquiryRun {
  execute(runId?: InquiryRunId): Promise<ExecuteInquiryRunOutput>;
}

type RunOutcome = Omit<CompleteInquiryRunInput, "id" | "completedAt">;

interface FailureDetail {
  kind: InquiryFailureKind;
  error: string;
}

class GraphTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`the ${GRAPH_NAME} graph did not answer within ${timeoutMs}ms`);
    this.name = "GraphTimeoutError";
  }
}

async function withTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new GraphTimeoutError(timeoutMs)), timeoutMs);
  });

  try {
    return await Promise.race([work, expiry]);
  } finally {
    clearTimeout(timer);
  }
}

function sample(value: unknown): string {
  return String(JSON.stringify(value)).slice(0, ERROR_SAMPLE_CHARS);
}

interface AttemptState {
  preserved: PreservedArtifacts;
  mapReady: boolean;
  closed: boolean;
}

function openAttempt(run: InquiryRun): AttemptState {
  return {
    preserved: {
      places: run.places,
      documents: run.documents,
      claimCount: run.claimCount,
      unplacedClaims: run.unplacedClaims,
      costUsd: run.costUsd,
      synthesis: run.synthesis,
    },
    mapReady: false,
    closed: false,
  };
}

function terminalBody(envelope: InquiryRunEnvelope): Record<string, unknown> {
  const result = envelope.data.result;
  if (typeof result !== "object" || result === null || Array.isArray(result)) {
    throw new Error(`the inquiry stream ended with an unusable ${envelope.type} result`);
  }
  return result as Record<string, unknown>;
}

function isExhausted(status: InquiryRunStatus, attempts: number): boolean {
  return status === "failed_retryable" && attempts >= INQUIRY_MAX_ATTEMPTS;
}

function failure(
  status: FailedInquiryStatus,
  detail: FailureDetail,
  attempts: number,
  preserved: PreservedArtifacts,
): RunOutcome {
  return {
    ...preserved,
    status: isExhausted(status, attempts) ? "failed_permanent" : status,
    failure: detail.kind,
    error: detail.error,
    completion: null,
    degradations: [],
  };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function degradedSuccess(
  preserved: PreservedArtifacts,
  degradations: InquiryDegradation[],
  error: string,
): RunOutcome {
  return {
    ...preserved,
    status: "succeeded",
    failure: null,
    error,
    completion: "degraded",
    degradations,
  };
}

function enrichmentLost(error: unknown, preserved: PreservedArtifacts): InquiryDegradation[] {
  if (error instanceof GraphTimeoutError) return ["enrichment_timeout"];
  if (preserved.synthesis === null) return ["synthesis_unavailable"];
  return ["place_read_unavailable"];
}

function completionFor(
  status: InquiryRunStatus,
  synthesis: string | null,
): Pick<RunOutcome, "completion" | "degradations"> {
  if (status !== "succeeded") return { completion: null, degradations: [] };
  if (synthesis === null) {
    return { completion: "degraded", degradations: ["synthesis_unavailable"] };
  }
  return { completion: "complete", degradations: [] };
}

function toOutcome(
  body: Record<string, unknown>,
  attempts: number,
  preserved: PreservedArtifacts,
): RunOutcome {
  if (!isTerminalStatus(body.status)) {
    return failure(
      "failed_permanent",
      { kind: "unusable_result", error: `unusable graph status: ${String(body.status)}` },
      attempts,
      preserved,
    );
  }

  const documents = asDocuments(body.documents);
  if (!documents) {
    return failure(
      "failed_permanent",
      { kind: "unusable_result", error: `unusable graph documents: ${sample(body.documents)}` },
      attempts,
      preserved,
    );
  }

  const places = asPlaces(body.places);
  if (!places) {
    return failure(
      "failed_permanent",
      { kind: "unusable_result", error: `unusable graph places: ${sample(body.places)}` },
      attempts,
      { ...preserved, documents },
    );
  }

  const claimCount = asCount(body.claimCount);
  const unplacedClaims = asCount(body.unplacedClaims);
  const costUsd = asCount(body.costUsd);
  if (claimCount === null || unplacedClaims === null || costUsd === null) {
    const counts = {
      claimCount: body.claimCount,
      unplacedClaims: body.unplacedClaims,
      costUsd: body.costUsd,
    };
    return failure(
      "failed_permanent",
      { kind: "unusable_result", error: `unusable graph counts: ${sample(counts)}` },
      attempts,
      { ...preserved, documents },
    );
  }

  return {
    status: isExhausted(body.status, attempts) ? "failed_permanent" : body.status,
    failure: isFailedInquiryStatus(body.status) ? "transport" : null,
    error: asText(body.error),
    places,
    documents,
    claimCount,
    unplacedClaims,
    costUsd,
    synthesis: asText(body.synthesis),
    ...completionFor(body.status, asText(body.synthesis)),
  };
}

export class ExecuteInquiryRunUseCase implements ExecuteInquiryRun {
  constructor(
    private readonly store: InquiryRunStorePort,
    private readonly orchestration: OrchestrationPort,
    private readonly retryAfterMs: number,
    private readonly runTimeoutMs: number,
    private readonly notifier: InquiryRunNotifierPort,
  ) {}

  async execute(runId?: InquiryRunId): Promise<ExecuteInquiryRunOutput> {
    const now = new Date();
    const claim = {
      now,
      completedBefore: new Date(now.getTime() - this.retryAfterMs),
      startedBefore: new Date(now.getTime() - this.runTimeoutMs * STALE_TIMEOUT_MULTIPLE),
    };
    const run = runId
      ? await this.store.claimInquiryRunById(runId, claim)
      : await this.store.claimNextInquiryRun(claim);
    if (!run) return { runId: null, status: null };
    await this.notify(run.id, run.progress.revision);

    const outcome = await this.outcomeFor(run, now);
    const revision = await this.store.completeInquiryRun({
      ...outcome,
      id: run.id,
      completedAt: new Date(),
    });
    if (revision !== null) await this.notify(run.id, revision);
    return { runId: run.id, status: outcome.status };
  }

  private async notify(runId: InquiryRunId, revision: number): Promise<void> {
    await notifyInquiryRun(this.notifier, this.store, { runId, revision });
  }

  private async outcomeFor(run: InquiryRun, now: Date): Promise<RunOutcome> {
    if (run.attempts > INQUIRY_MAX_ATTEMPTS) {
      return failure(
        "failed_permanent",
        {
          kind: "abandoned",
          error: `abandoned after ${INQUIRY_MAX_ATTEMPTS} interrupted attempts`,
        },
        run.attempts,
        openAttempt(run).preserved,
      );
    }
    if (run.attempts > 1 && this.outlivedRetryBudget(run, now)) {
      return failure(
        "failed_permanent",
        { kind: "abandoned", error: "abandoned: outlived its retry budget" },
        run.attempts,
        openAttempt(run).preserved,
      );
    }
    return this.measure(run);
  }

  /** a live run cannot outlast its own retries, so an older re-claim is a restart reclaiming a corpse */
  private outlivedRetryBudget(run: InquiryRun, now: Date): boolean {
    const budgetMs = INQUIRY_MAX_ATTEMPTS * (this.runTimeoutMs + this.retryAfterMs);
    return now.getTime() - run.createdAt.getTime() > budgetMs;
  }

  private async measure(run: InquiryRun): Promise<RunOutcome> {
    const attempt = openAttempt(run);
    try {
      const body = await withTimeout(this.consume(run, attempt), this.runTimeoutMs);
      const outcome = toOutcome(body, run.attempts, attempt.preserved);
      const preserved = attempt.preserved.documents;
      if (outcome.documents.length > 0 || preserved.length === 0) return outcome;
      return { ...outcome, documents: preserved };
    } catch (error) {
      attempt.closed = true;
      return this.recover(error, run, attempt);
    }
  }

  /** a durable map outlives its enrichment, so losing the stream after it degrades rather than fails */
  private recover(error: unknown, run: InquiryRun, attempt: AttemptState): RunOutcome {
    if (attempt.mapReady) {
      return degradedSuccess(
        attempt.preserved,
        enrichmentLost(error, attempt.preserved),
        messageOf(error),
      );
    }
    if (error instanceof GraphTimeoutError || error instanceof GraphUnavailableError) {
      return failure(
        "failed_retryable",
        { kind: "transport", error: error.message },
        run.attempts,
        attempt.preserved,
      );
    }
    if (error instanceof GraphUnreadableError) {
      return failure(
        "failed_permanent",
        { kind: "unusable_result", error: error.message },
        run.attempts,
        attempt.preserved,
      );
    }
    return failure(
      "failed_permanent",
      { kind: "internal", error: messageOf(error) },
      run.attempts,
      attempt.preserved,
    );
  }

  private async consume(run: InquiryRun, attempt: AttemptState): Promise<Record<string, unknown>> {
    const frames = this.orchestration.stream({
      graphName: GRAPH_NAME,
      runId: run.id,
      input: { question: run.question, window: run.window },
      attempt: run.attempts,
    });

    for await (const frame of frames) {
      if (!isRunEnvelope(frame)) continue;
      if (isTerminalRunEnvelope(frame)) return terminalBody(frame);
      await this.persist(run, frame, attempt);
    }
    throw new GraphUnavailableError("the inquiry stream ended without a terminal result");
  }

  /** an unusable milestone is skipped, not fatal — the terminal result is validated on its own */
  private async persist(
    run: InquiryRun,
    envelope: InquiryRunEnvelope,
    attempt: AttemptState,
  ): Promise<void> {
    if (attempt.closed) return;
    const checkpoint = toCheckpoint(run.id, envelope, attempt.preserved.places);
    if (!checkpoint) return;

    const revision = await this.store.applyInquiryRunCheckpoint(checkpoint);
    if (revision === null) return;

    attempt.preserved = withCheckpoint(attempt.preserved, checkpoint);
    attempt.mapReady = attempt.mapReady || checkpoint.stage === "map_ready";
    await this.notify(run.id, revision);
  }
}
