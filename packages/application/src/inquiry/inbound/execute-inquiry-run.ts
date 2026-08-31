import type {
  InquiryClaim,
  InquiryPlace,
  InquiryPlaceRead,
  InquiryRun,
  InquiryRunId,
  InquiryRunStatus,
  InquirySourceDocument,
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

function isSafeSourceImageUrl(value: string): boolean {
  if (value !== value.trim()) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.length > 0 &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}

function asClaim(value: unknown): InquiryClaim | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.text !== "string") return null;
  if (typeof row.confidence !== "number") return null;
  if (typeof row.sourceUrl !== "string") return null;
  if (!isNullableText(row.sourceTitle)) return null;
  if (!isNullableText(row.publishedDate)) return null;
  if (
    row.sourceImageUrl !== undefined &&
    row.sourceImageUrl !== null &&
    (typeof row.sourceImageUrl !== "string" || !isSafeSourceImageUrl(row.sourceImageUrl))
  ) {
    return null;
  }
  return {
    text: row.text,
    confidence: row.confidence,
    sourceUrl: row.sourceUrl,
    sourceTitle: row.sourceTitle,
    publishedDate: row.publishedDate,
    sourceImageUrl: row.sourceImageUrl ?? null,
  };
}

function asPlaceRead(value: unknown, claims: InquiryClaim[]): InquiryPlaceRead | null {
  if (value === undefined || value === null || claims.length < 2) return null;
  if (typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.text !== "string" || row.text.trim().length === 0) return null;
  if (!Array.isArray(row.sourceUrls) || row.sourceUrls.length === 0) return null;
  if (!row.sourceUrls.every((sourceUrl) => typeof sourceUrl === "string")) return null;
  const claimSourceUrls = new Set(claims.map((claim) => claim.sourceUrl));
  if (!row.sourceUrls.every((sourceUrl) => claimSourceUrls.has(sourceUrl))) return null;
  return {
    text: row.text.trim(),
    sourceUrls: [...new Set(row.sourceUrls)],
  };
}

function asPlace(value: unknown): InquiryPlace | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.place !== "string") return null;
  if (!isNullableText(row.country)) return null;
  if (typeof row.latitude !== "number") return null;
  if (typeof row.longitude !== "number") return null;
  if (!Array.isArray(row.claims)) return null;
  const claims: InquiryClaim[] = [];
  for (const value of row.claims) {
    const claim = asClaim(value);
    if (claim === null) return null;
    claims.push(claim);
  }
  if (row.claimCount !== claims.length) return null;
  return {
    place: row.place,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    claimCount: claims.length,
    read: asPlaceRead(row.read, claims),
    claims,
  };
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asPlaces(value: unknown): InquiryPlace[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const places: InquiryPlace[] = [];
  for (const row of value) {
    const place = asPlace(row);
    if (place === null) return null;
    places.push(place);
  }
  return places;
}

function asSourceDocument(value: unknown): InquirySourceDocument | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.url !== "string") return null;
  if (!isNullableText(row.title)) return null;
  if (!isNullableText(row.publishedDate)) return null;
  if (!isNullableText(row.text)) return null;
  if (!Array.isArray(row.highlights)) return null;
  if (!row.highlights.every((highlight) => typeof highlight === "string")) return null;
  return {
    url: row.url,
    title: row.title,
    publishedDate: row.publishedDate,
    text: row.text,
    highlights: row.highlights,
  };
}

function asDocuments(value: unknown): InquirySourceDocument[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const documents: InquirySourceDocument[] = [];
  for (const row of value) {
    const document = asSourceDocument(row);
    if (document === null) return null;
    documents.push(document);
  }
  return documents;
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

function failure(
  status: FailedStatus,
  error: string,
  attempts: number,
  documents: InquirySourceDocument[] = [],
): RunOutcome {
  return {
    status: isExhausted(status, attempts) ? "failed_permanent" : status,
    error,
    places: [],
    documents,
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

  const documents = asDocuments(body.documents);
  if (!documents) {
    return failure(
      "failed_permanent",
      `unusable graph documents: ${sample(body.documents)}`,
      attempts,
    );
  }

  const places = asPlaces(body.places);
  if (!places) {
    return failure(
      "failed_permanent",
      `unusable graph places: ${sample(body.places)}`,
      attempts,
      documents,
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
      `unusable graph counts: ${sample(counts)}`,
      attempts,
      documents,
    );
  }

  return {
    status: isExhausted(body.status, attempts) ? "failed_permanent" : body.status,
    error: asText(body.error),
    places,
    documents,
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
        run.documents,
      );
    }
    if (run.attempts > 1 && this.outlivedRetryBudget(run, now)) {
      return failure(
        "failed_permanent",
        "abandoned: outlived its retry budget",
        run.attempts,
        run.documents,
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
    try {
      const body = await withTimeout(
        this.orchestration.run({
          graphName: GRAPH_NAME,
          input: { question: run.question, window: run.window },
        }),
        this.runTimeoutMs,
      );
      const outcome = toOutcome(body, run.attempts);
      if (outcome.documents.length > 0 || run.documents.length === 0) return outcome;
      return { ...outcome, documents: run.documents };
    } catch (error) {
      if (error instanceof GraphTimeoutError || error instanceof GraphUnavailableError) {
        return failure("failed_retryable", error.message, run.attempts, run.documents);
      }
      return failure(
        "failed_permanent",
        error instanceof Error ? error.message : String(error),
        run.attempts,
        run.documents,
      );
    }
  }
}
