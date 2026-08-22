import type {
  InquiryClaim,
  InquiryPlace,
  InquiryRun,
  InquiryRunId,
  InquiryRunStatus,
} from "@atlas/domain";
import { INQUIRY_RUN_STATUSES } from "@atlas/domain";
import type { OrchestrationPort } from "../../world/outbound/orchestration.ts";
import { GraphUnavailableError } from "../../world/outbound/orchestration.ts";
import type {
  CompleteInquiryRunInput,
  InquiryRunStorePort,
} from "../outbound/inquiry-run-store.ts";
import { INQUIRY_MAX_ATTEMPTS } from "../outbound/inquiry-run-store.ts";

const GRAPH_NAME = "inquiry";
const ERROR_SAMPLE_CHARS = 200;
const STALE_TIMEOUT_MULTIPLE = 2;
const IN_FLIGHT_STATUSES = ["queued", "running"] as const satisfies readonly InquiryRunStatus[];

export interface ExecuteInquiryRunOutput {
  runId: InquiryRunId | null;
  status: InquiryRunStatus | null;
}

export interface ExecuteInquiryRun {
  execute(): Promise<ExecuteInquiryRunOutput>;
}

type RunOutcome = Omit<CompleteInquiryRunInput, "id" | "completedAt">;
type FailedStatus = Extract<InquiryRunStatus, "failed_retryable" | "failed_permanent">;

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

function isTerminalStatus(value: unknown): value is InquiryRunStatus {
  if (typeof value !== "string") return false;
  if (!(INQUIRY_RUN_STATUSES as readonly string[]).includes(value)) return false;
  return !(IN_FLIGHT_STATUSES as readonly string[]).includes(value);
}

function isNullableText(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isClaim(value: unknown): value is InquiryClaim {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.text === "string" &&
    typeof row.confidence === "number" &&
    typeof row.sourceUrl === "string" &&
    isNullableText(row.sourceTitle) &&
    isNullableText(row.publishedDate)
  );
}

/**
 * A place without real coordinates cannot be an orb, so it must never reach the map, and a
 * `claimCount` that disagrees with the claims beside it would print a wrong number over a right list.
 */
function isPlace(value: unknown): value is InquiryPlace {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.place === "string" &&
    isNullableText(row.country) &&
    typeof row.latitude === "number" &&
    typeof row.longitude === "number" &&
    Array.isArray(row.claims) &&
    row.claims.every(isClaim) &&
    row.claimCount === row.claims.length
  );
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asPlaces(value: unknown): InquiryPlace[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const rows = value.filter(isPlace);
  return rows.length === value.length ? rows : null;
}

function asCount(value: unknown): number | null {
  if (value === undefined || value === null) return 0;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function sample(value: unknown): string {
  return String(JSON.stringify(value)).slice(0, ERROR_SAMPLE_CHARS);
}

function isExhausted(status: InquiryRunStatus, attempts: number): boolean {
  return status === "failed_retryable" && attempts >= INQUIRY_MAX_ATTEMPTS;
}

function failure(status: FailedStatus, error: string, attempts: number): RunOutcome {
  return {
    status: isExhausted(status, attempts) ? "failed_permanent" : status,
    error,
    places: [],
    claimCount: 0,
    unplacedClaims: 0,
    costUsd: 0,
    synthesis: null,
  };
}

function toOutcome(body: Record<string, unknown>, attempts: number): RunOutcome {
  if (!isTerminalStatus(body.status)) {
    return failure("failed_permanent", `unusable graph status: ${String(body.status)}`, attempts);
  }

  const places = asPlaces(body.places);
  if (!places) {
    return failure("failed_permanent", `unusable graph places: ${sample(body.places)}`, attempts);
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
    return failure("failed_permanent", `unusable graph counts: ${sample(counts)}`, attempts);
  }

  return {
    status: isExhausted(body.status, attempts) ? "failed_permanent" : body.status,
    error: asText(body.error),
    places,
    claimCount,
    unplacedClaims,
    costUsd,
    synthesis: asText(body.synthesis),
  };
}

export class ExecuteInquiryRunUseCase implements ExecuteInquiryRun {
  constructor(
    private readonly store: InquiryRunStorePort,
    private readonly orchestration: OrchestrationPort,
    private readonly retryAfterMs: number,
    private readonly runTimeoutMs: number,
  ) {}

  async execute(): Promise<ExecuteInquiryRunOutput> {
    const now = new Date();
    const run = await this.store.claimNextInquiryRun({
      now,
      completedBefore: new Date(now.getTime() - this.retryAfterMs),
      startedBefore: new Date(now.getTime() - this.runTimeoutMs * STALE_TIMEOUT_MULTIPLE),
    });
    if (!run) return { runId: null, status: null };

    const outcome = await this.outcomeFor(run, now);
    await this.store.completeInquiryRun({ ...outcome, id: run.id, completedAt: new Date() });
    return { runId: run.id, status: outcome.status };
  }

  private async outcomeFor(run: InquiryRun, now: Date): Promise<RunOutcome> {
    if (run.attempts > INQUIRY_MAX_ATTEMPTS) {
      return failure(
        "failed_permanent",
        `abandoned after ${INQUIRY_MAX_ATTEMPTS} interrupted attempts`,
        run.attempts,
      );
    }
    if (run.attempts > 1 && this.outlivedRetryBudget(run, now)) {
      return failure("failed_permanent", "abandoned: outlived its retry budget", run.attempts);
    }
    return this.measure(run);
  }

  /** a live run cannot outlast its own retries, so an older re-claim is a restart reclaiming a corpse */
  private outlivedRetryBudget(run: InquiryRun, now: Date): boolean {
    const budgetMs = INQUIRY_MAX_ATTEMPTS * (this.runTimeoutMs + this.retryAfterMs);
    return now.getTime() - run.createdAt.getTime() > budgetMs;
  }

  private async measure(run: InquiryRun): Promise<RunOutcome> {
    try {
      const body = await withTimeout(
        this.orchestration.run({
          graphName: GRAPH_NAME,
          input: { question: run.question, window: run.window },
        }),
        this.runTimeoutMs,
      );
      return toOutcome(body, run.attempts);
    } catch (error) {
      if (error instanceof GraphTimeoutError || error instanceof GraphUnavailableError) {
        return failure("failed_retryable", error.message, run.attempts);
      }
      return failure(
        "failed_permanent",
        error instanceof Error ? error.message : String(error),
        run.attempts,
      );
    }
  }
}
