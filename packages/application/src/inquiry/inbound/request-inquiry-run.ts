import type {
  InquiryAttachmentId,
  InquiryRun,
  InquiryRunId,
  InquiryRunStatus,
  UserId,
  UserRole,
} from "@atlas/domain";
import { hasAtLeastRole, makeInquiryRunId, queuedInquiryProgress } from "@atlas/domain";
import type { InquiryAttachmentStorePort } from "../outbound/inquiry-attachment-store.ts";
import type { InquiryJobPublisherPort } from "../outbound/inquiry-job-queue.ts";
import type { InquiryRunStorePort } from "../outbound/inquiry-run-store.ts";

export const INQUIRY_WINDOW = "1w";
const MAX_QUESTION_CHARS = 500;
const MAX_OUTSTANDING_RUNS = 5;

export class InvalidInquiryQuestionError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "InvalidInquiryQuestionError";
  }
}

export class InquiryDailyCapReachedError extends Error {
  constructor(dailyCap: number) {
    super(
      `Inquiry limit reached — ${dailyCap} daily runs or ${MAX_OUTSTANDING_RUNS} outstanding runs. Stored runs are still readable.`,
    );
    this.name = "InquiryDailyCapReachedError";
  }
}

export class InquiryEmailVerificationRequiredError extends Error {
  constructor() {
    super("Verify your email before starting an inquiry");
    this.name = "InquiryEmailVerificationRequiredError";
  }
}

export interface RequestInquiryRunInput {
  ownerId: UserId;
  role: UserRole;
  emailVerified: boolean;
  question: string;
  refresh: boolean;
  attachmentId?: InquiryAttachmentId;
}

export interface RequestInquiryRunOutput {
  runId: InquiryRunId;
  status: InquiryRunStatus;
  deduped: boolean;
  dispatched: boolean;
  dispatchError?: string;
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

function isReusable(run: InquiryRun): boolean {
  return run.status !== "failed_permanent";
}

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
    documents: [],
    claimCount: 0,
    unplacedClaims: 0,
    costUsd: 0,
    synthesis: null,
    status: "queued",
    failure: null,
    error: null,
    attempts: 0,
    progress: queuedInquiryProgress(input.now),
    completion: null,
    degradations: [],
    createdAt: input.now,
    startedAt: null,
    completedAt: null,
  };
}

export class RequestInquiryRunUseCase implements RequestInquiryRun {
  constructor(
    private readonly store: InquiryRunStorePort,
    private readonly dailyCap: number,
    private readonly queue: InquiryJobPublisherPort,
    private readonly attachments?: InquiryAttachmentStorePort,
  ) {}

  async execute(input: RequestInquiryRunInput): Promise<RequestInquiryRunOutput> {
    if (!input.emailVerified) throw new InquiryEmailVerificationRequiredError();

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
    const attachment =
      input.attachmentId && this.attachments
        ? await this.attachments.findInquiryAttachmentById(input.attachmentId)
        : null;
    if (
      input.attachmentId &&
      (!attachment ||
        attachment.ownerId !== input.ownerId ||
        attachment.runId !== null ||
        attachment.expiresAt === null ||
        attachment.expiresAt <= now ||
        attachment.interpretation === null)
    ) {
      throw new InvalidInquiryQuestionError(
        "Attachment is unavailable or has not been interpreted",
      );
    }

    const stored = await this.store.findInquiryRunByQuestionDay(input.ownerId, questionKey, day);
    const reusable = pickReusable(stored, input.refresh);
    if (reusable) {
      if (input.attachmentId) await this.attachments?.deleteInquiryAttachment(input.attachmentId);
      return { runId: reusable.id, status: reusable.status, deduped: true, dispatched: true };
    }

    const run = queuedRun({ ownerId: input.ownerId, question, questionKey, day, now });
    const cap = hasAtLeastRole(input.role, "admin") ? null : this.dailyCap;
    const reserved = await this.store.reserveInquiryRun(run, cap, MAX_OUTSTANDING_RUNS);
    if (!reserved) throw new InquiryDailyCapReachedError(this.dailyCap);
    if (input.attachmentId) {
      await this.attachments?.attachInquiryAttachment(input.attachmentId, run.id);
    }
    return {
      runId: run.id,
      status: run.status,
      deduped: false,
      ...(await this.dispatch(run.id)),
    };
  }

  private async dispatch(
    runId: InquiryRunId,
  ): Promise<{ dispatched: boolean; dispatchError?: string }> {
    try {
      await this.queue.publish(runId);
      return { dispatched: true };
    } catch (error) {
      return {
        dispatched: false,
        dispatchError: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

function pickReusable(stored: InquiryRun | null, refresh: boolean): InquiryRun | null {
  if (!stored) return null;
  if (refresh) return isInFlight(stored) ? stored : null;
  return isReusable(stored) ? stored : null;
}
