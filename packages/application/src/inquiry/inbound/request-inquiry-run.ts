import type { InquiryRun, InquiryRunId, InquiryRunStatus, UserId } from "@atlas/domain";
import { makeInquiryRunId } from "@atlas/domain";
import type { InquiryRunStorePort } from "../outbound/inquiry-run-store.ts";

const INQUIRY_WINDOW = "1w";
const MAX_QUESTION_CHARS = 500;

export class InvalidInquiryQuestionError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "InvalidInquiryQuestionError";
  }
}

export class InquiryDailyCapReachedError extends Error {
  constructor(dailyCap: number) {
    super(`Daily inquiry limit reached — ${dailyCap} runs today. Stored runs are still readable.`);
    this.name = "InquiryDailyCapReachedError";
  }
}

export interface RequestInquiryRunInput {
  ownerId: UserId;
  question: string;
  refresh: boolean;
}

export interface RequestInquiryRunOutput {
  runId: InquiryRunId;
  status: InquiryRunStatus;
  deduped: boolean;
}

export interface RequestInquiryRun {
  execute(input: RequestInquiryRunInput): Promise<RequestInquiryRunOutput>;
}

function toQuestionKey(question: string): string {
  return question.toLowerCase().replace(/\s+/g, " ");
}

function toDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** a permanent failure is not an answer, so asking again is a new run rather than a replay */
function isReusable(run: InquiryRun): boolean {
  return run.status !== "failed_permanent";
}

/** work already under way has no newer answer to fetch, so a refresh waits for it */
function isInFlight(run: InquiryRun): boolean {
  return run.status === "queued" || run.status === "running";
}

function queuedRun(input: {
  ownerId: UserId;
  question: string;
  questionKey: string;
  day: string;
  now: Date;
}): InquiryRun {
  return {
    id: makeInquiryRunId(crypto.randomUUID()),
    ownerId: input.ownerId,
    question: input.question,
    questionKey: input.questionKey,
    day: input.day,
    window: INQUIRY_WINDOW,
    places: [],
    claimCount: 0,
    unplacedClaims: 0,
    costUsd: 0,
    synthesis: null,
    status: "queued",
    error: null,
    attempts: 0,
    createdAt: input.now,
    startedAt: null,
    completedAt: null,
  };
}

export class RequestInquiryRunUseCase implements RequestInquiryRun {
  constructor(
    private readonly store: InquiryRunStorePort,
    private readonly dailyCap: number,
  ) {}

  async execute(input: RequestInquiryRunInput): Promise<RequestInquiryRunOutput> {
    const question = input.question.trim();
    if (!question) throw new InvalidInquiryQuestionError("An inquiry question is required");
    if (question.length > MAX_QUESTION_CHARS) {
      throw new InvalidInquiryQuestionError(
        `An inquiry question must be at most ${MAX_QUESTION_CHARS} characters`,
      );
    }

    const now = new Date();
    const day = toDay(now);
    const questionKey = toQuestionKey(question);

    const reusable = await this.reusableRun(input.ownerId, input.refresh, questionKey, day);
    if (reusable) {
      return { runId: reusable.id, status: reusable.status, deduped: true };
    }

    const used = await this.store.countInquiryRunsForDay(day);
    if (used >= this.dailyCap) throw new InquiryDailyCapReachedError(this.dailyCap);

    const run = queuedRun({ ownerId: input.ownerId, question, questionKey, day, now });
    await this.store.saveInquiryRun(run);
    return { runId: run.id, status: run.status, deduped: false };
  }

  private async reusableRun(
    ownerId: UserId,
    refresh: boolean,
    questionKey: string,
    day: string,
  ): Promise<InquiryRun | null> {
    const stored = await this.store.findInquiryRunByQuestionDay(ownerId, questionKey, day);
    if (!stored) return null;
    if (refresh) return isInFlight(stored) ? stored : null;
    return isReusable(stored) ? stored : null;
  }
}
