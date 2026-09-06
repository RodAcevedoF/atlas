import type {
  FailedInquiryStatus,
  InquiryClaim,
  InquiryFailureKind,
  InquiryPlace,
  InquiryPlaceRead,
  InquiryRun,
  InquiryRunId,
  InquiryRunStatus,
  InquirySourceDocument,
} from "@atlas/domain";
import type { InquiryDegradation } from "@atlas/domain";
import { INQUIRY_RUN_STATUSES, isFailedInquiryStatus } from "@atlas/domain";
import type { OrchestrationPort } from "../../world/outbound/orchestration.ts";
import { GraphUnavailableError, GraphUnreadableError } from "../../world/outbound/orchestration.ts";
import type { InquiryRunEnvelope } from "../../world/outbound/run-envelope.ts";
import { isRunEnvelope, isTerminalRunEnvelope } from "../../world/outbound/run-envelope.ts";
import type {
  CompleteInquiryRunInput,
  InquiryRunCheckpoint,
  InquiryRunStorePort,
} from "../outbound/inquiry-run-store.ts";
import { INQUIRY_MAX_ATTEMPTS } from "../outbound/inquiry-run-store.ts";

const GRAPH_NAME = "inquiry";
const ERROR_SAMPLE_CHARS = 2000;
export const STALE_TIMEOUT_MULTIPLE = 2;
const IN_FLIGHT_STATUSES = ["queued", "running"] as const satisfies readonly InquiryRunStatus[];

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

interface PreservedArtifacts {
  places: InquiryPlace[];
  documents: InquirySourceDocument[];
  claimCount: number;
  unplacedClaims: number;
  costUsd: number;
  synthesis: string | null;
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

type CheckpointOrigin = Pick<InquiryRunCheckpoint, "id" | "attempt" | "sequence" | "occurredAt">;

function retrievalCheckpoint(
  origin: CheckpointOrigin,
  data: Record<string, unknown>,
): InquiryRunCheckpoint | null {
  const documents = asDocuments(data.documents);
  const claimCount = asCount(data.claimCount);
  const costUsd = asCount(data.costUsd);
  if (documents === null || claimCount === null || costUsd === null) return null;
  return { ...origin, stage: "retrieval_complete", documents, claimCount, costUsd };
}

function mapCheckpoint(
  origin: CheckpointOrigin,
  data: Record<string, unknown>,
): InquiryRunCheckpoint | null {
  const places = asPlaces(data.places);
  const claimCount = asCount(data.claimCount);
  const unplacedClaims = asCount(data.unplacedClaims);
  if (places === null || claimCount === null || unplacedClaims === null) return null;
  return { ...origin, stage: "map_ready", places, claimCount, unplacedClaims };
}

function synthesisCheckpoint(
  origin: CheckpointOrigin,
  data: Record<string, unknown>,
): InquiryRunCheckpoint | null {
  const synthesis = asText(data.synthesis);
  if (synthesis === null) return null;
  return { ...origin, stage: "synthesis_ready", synthesis };
}

function placeReadCheckpoint(
  origin: CheckpointOrigin,
  data: Record<string, unknown>,
  places: InquiryPlace[],
): InquiryRunCheckpoint | null {
  const { latitude, longitude } = data;
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  const mapped = places.find(
    (place) => place.latitude === latitude && place.longitude === longitude,
  );
  if (!mapped) return null;
  const read = asPlaceRead(data.read, mapped.claims);
  if (read === null) return null;
  return { ...origin, stage: "place_read_ready", latitude, longitude, read };
}

function toCheckpoint(
  runId: InquiryRunId,
  envelope: InquiryRunEnvelope,
  places: InquiryPlace[],
): InquiryRunCheckpoint | null {
  const origin = {
    id: runId,
    attempt: envelope.attempt,
    sequence: envelope.sequence,
    occurredAt: envelope.occurredAt,
  };
  if (envelope.type === "retrieval_complete") return retrievalCheckpoint(origin, envelope.data);
  if (envelope.type === "map_ready") return mapCheckpoint(origin, envelope.data);
  if (envelope.type === "synthesis_ready") return synthesisCheckpoint(origin, envelope.data);
  if (envelope.type === "place_read_ready") {
    return placeReadCheckpoint(origin, envelope.data, places);
  }
  return null;
}

function withCheckpoint(
  preserved: PreservedArtifacts,
  checkpoint: InquiryRunCheckpoint,
): PreservedArtifacts {
  if (checkpoint.stage === "retrieval_complete") {
    return {
      ...preserved,
      documents: checkpoint.documents,
      claimCount: checkpoint.claimCount,
      costUsd: checkpoint.costUsd,
    };
  }
  if (checkpoint.stage === "map_ready") {
    return {
      ...preserved,
      places: checkpoint.places,
      claimCount: checkpoint.claimCount,
      unplacedClaims: checkpoint.unplacedClaims,
    };
  }
  if (checkpoint.stage === "synthesis_ready") {
    return { ...preserved, synthesis: checkpoint.synthesis };
  }
  return {
    ...preserved,
    places: preserved.places.map((place) =>
      place.latitude === checkpoint.latitude && place.longitude === checkpoint.longitude
        ? { ...place, read: checkpoint.read }
        : place,
    ),
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

    const outcome = await this.outcomeFor(run, now);
    await this.store.completeInquiryRun({ ...outcome, id: run.id, completedAt: new Date() });
    return { runId: run.id, status: outcome.status };
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
  }
}
