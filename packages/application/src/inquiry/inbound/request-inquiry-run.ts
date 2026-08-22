import type { ResearchRun, ResearchRunId, ResearchRunStatus } from "@atlas/domain";
import { makeResearchRunId } from "@atlas/domain";
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
  question: string;
}

export interface RequestInquiryRunOutput {
  runId: ResearchRunId;
  status: ResearchRunStatus;
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
function isReusable(run: ResearchRun): boolean {
  return run.status !== "failed_permanent";
}

function queuedRun(input: {
  question: string;
  questionKey: string;
  day: string;
  now: Date;
}): ResearchRun {
  return {
    id: makeResearchRunId(crypto.randomUUID()),
    question: input.question,
    questionKey: input.questionKey,
    day: input.day,
    executedQuery: null,
    window: INQUIRY_WINDOW,
    distribution: [],
    exemplars: [],
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

    const stored = await this.store.findInquiryRunByQuestionDay(questionKey, day);
    if (stored && isReusable(stored)) {
      return { runId: stored.id, status: stored.status, deduped: true };
    }

    const used = await this.store.countInquiryRunsForDay(day);
    if (used >= this.dailyCap) throw new InquiryDailyCapReachedError(this.dailyCap);

    const run = queuedRun({ question, questionKey, day, now });
    await this.store.saveInquiryRun(run);
    return { runId: run.id, status: run.status, deduped: false };
  }
}
