import type {
  CountryAwareness,
  ResearchRun,
  ResearchRunId,
  ResearchRunStatus,
} from "@atlas/domain";
import { AWARENESS_CONFIDENCES, RESEARCH_RUN_STATUSES } from "@atlas/domain";
import type { OrchestrationPort } from "../../world/outbound/orchestration.ts";
import type {
  CompleteResearchRunInput,
  ResearchRunStorePort,
} from "../outbound/research-run-store.ts";
import { RESEARCH_MAX_ATTEMPTS } from "../outbound/research-run-store.ts";

const GRAPH_NAME = "awareness";
const ERROR_SAMPLE_CHARS = 200;
/** a live run cannot outlast its own timeout, so an older `running` row belongs to a dead process */
const STALE_TIMEOUT_MULTIPLE = 2;
const IN_FLIGHT_STATUSES = ["queued", "running"] as const satisfies readonly ResearchRunStatus[];

export interface ExecuteResearchRunOutput {
  runId: ResearchRunId | null;
  status: ResearchRunStatus | null;
}

export interface ExecuteResearchRun {
  execute(): Promise<ExecuteResearchRunOutput>;
}

type RunOutcome = Omit<CompleteResearchRunInput, "id" | "completedAt">;
type FailedStatus = Extract<ResearchRunStatus, "failed_retryable" | "failed_permanent">;

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

function isTerminalStatus(value: unknown): value is ResearchRunStatus {
  if (typeof value !== "string") return false;
  if (!(RESEARCH_RUN_STATUSES as readonly string[]).includes(value)) return false;
  return !(IN_FLIGHT_STATUSES as readonly string[]).includes(value);
}

function isCountryAwareness(value: unknown): value is CountryAwareness {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.country === "string" &&
    typeof row.awareness === "number" &&
    typeof row.peak === "number" &&
    typeof row.coveredBuckets === "number" &&
    typeof row.totalBuckets === "number" &&
    typeof row.confidence === "string" &&
    (AWARENESS_CONFIDENCES as readonly string[]).includes(row.confidence)
  );
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asDistribution(value: unknown): CountryAwareness[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const rows = value.filter(isCountryAwareness);
  return rows.length === value.length ? rows : null;
}

function sample(value: unknown): string {
  return String(JSON.stringify(value)).slice(0, ERROR_SAMPLE_CHARS);
}

function isExhausted(status: ResearchRunStatus, attempts: number): boolean {
  return status === "failed_retryable" && attempts >= RESEARCH_MAX_ATTEMPTS;
}

function failure(status: FailedStatus, error: string, attempts: number): RunOutcome {
  return {
    status: isExhausted(status, attempts) ? "failed_permanent" : status,
    error,
    executedQuery: null,
    distribution: [],
    exemplars: [],
    synthesis: null,
  };
}

function toOutcome(body: Record<string, unknown>, attempts: number): RunOutcome {
  if (!isTerminalStatus(body.status)) {
    return failure("failed_permanent", `unusable graph status: ${String(body.status)}`, attempts);
  }

  const distribution = asDistribution(body.distribution);
  if (!distribution) {
    return failure(
      "failed_permanent",
      `unusable graph distribution: ${sample(body.distribution)}`,
      attempts,
    );
  }

  return {
    status: isExhausted(body.status, attempts) ? "failed_permanent" : body.status,
    error: asText(body.error),
    executedQuery: asText(body.executedQuery),
    distribution,
    exemplars: [],
    synthesis: asText(body.synthesis),
  };
}

export class ExecuteResearchRunUseCase implements ExecuteResearchRun {
  constructor(
    private readonly store: ResearchRunStorePort,
    private readonly orchestration: OrchestrationPort,
    private readonly retryAfterMs: number,
    private readonly runTimeoutMs: number,
  ) {}

  async execute(): Promise<ExecuteResearchRunOutput> {
    const now = new Date();
    const run = await this.store.claimNextResearchRun({
      now,
      completedBefore: new Date(now.getTime() - this.retryAfterMs),
      startedBefore: new Date(now.getTime() - this.runTimeoutMs * STALE_TIMEOUT_MULTIPLE),
    });
    if (!run) return { runId: null, status: null };

    const outcome = await this.outcomeFor(run);
    await this.store.completeResearchRun({ ...outcome, id: run.id, completedAt: new Date() });
    return { runId: run.id, status: outcome.status };
  }

  private async outcomeFor(run: ResearchRun): Promise<RunOutcome> {
    if (run.attempts > RESEARCH_MAX_ATTEMPTS) {
      return failure(
        "failed_permanent",
        `abandoned after ${RESEARCH_MAX_ATTEMPTS} interrupted attempts`,
        run.attempts,
      );
    }
    return this.measure(run);
  }

  private async measure(run: ResearchRun): Promise<RunOutcome> {
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
      if (error instanceof GraphTimeoutError) {
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
