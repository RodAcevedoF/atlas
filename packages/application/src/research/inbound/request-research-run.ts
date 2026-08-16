import type { ResearchRun, ResearchRunId, ResearchRunStatus } from "@atlas/domain";
import { makeResearchRunId } from "@atlas/domain";
import type { ResearchRunStorePort } from "../outbound/research-run-store.ts";

const RESEARCH_WINDOW = "1w";
const MAX_QUESTION_CHARS = 500;

export class InvalidResearchQuestionError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "InvalidResearchQuestionError";
  }
}

export class ResearchDailyCapReachedError extends Error {
  constructor(dailyCap: number) {
    super(`Daily research limit reached — ${dailyCap} runs today. Stored runs are still readable.`);
    this.name = "ResearchDailyCapReachedError";
  }
}

export interface RequestResearchRunInput {
  question: string;
}

export interface RequestResearchRunOutput {
  runId: ResearchRunId;
  status: ResearchRunStatus;
  deduped: boolean;
}

export interface RequestResearchRun {
  execute(input: RequestResearchRunInput): Promise<RequestResearchRunOutput>;
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
    window: RESEARCH_WINDOW,
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

export class RequestResearchRunUseCase implements RequestResearchRun {
  constructor(
    private readonly store: ResearchRunStorePort,
    private readonly dailyCap: number,
  ) {}

  async execute(input: RequestResearchRunInput): Promise<RequestResearchRunOutput> {
    const question = input.question.trim();
    if (!question) throw new InvalidResearchQuestionError("A research question is required");
    if (question.length > MAX_QUESTION_CHARS) {
      throw new InvalidResearchQuestionError(
        `A research question must be at most ${MAX_QUESTION_CHARS} characters`,
      );
    }

    const now = new Date();
    const day = toDay(now);
    const questionKey = toQuestionKey(question);

    const stored = await this.store.findResearchRunByQuestionDay(questionKey, day);
    if (stored && isReusable(stored)) {
      return { runId: stored.id, status: stored.status, deduped: true };
    }

    const used = await this.store.countResearchRunsForDay(day);
    if (used >= this.dailyCap) throw new ResearchDailyCapReachedError(this.dailyCap);

    const run = queuedRun({ question, questionKey, day, now });
    await this.store.saveResearchRun(run);
    return { runId: run.id, status: run.status, deduped: false };
  }
}
