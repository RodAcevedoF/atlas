import type {
  InquiryAttachmentId,
  InquiryRun,
  InquiryRunId,
  InquiryRunStatus,
  UserId,
  UserRole,
} from "@atlas/domain";
import { hasAtLeastRole, makeInquiryRunId } from "@atlas/domain";
import type { InquiryAttachmentStorePort } from "../outbound/inquiry-attachment-store.ts";
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
      return { runId: reusable.id, status: reusable.status, deduped: true };
    }

    if (countsAgainstBudget(input, stored)) {
      const used = await this.store.countSucceededQuestionsForOwnerDay(input.ownerId, day);
      if (used >= this.dailyCap) throw new InquiryDailyCapReachedError(this.dailyCap);
    }

    const run = queuedRun({ ownerId: input.ownerId, question, questionKey, day, now });
    await this.store.saveInquiryRun(run);
    if (input.attachmentId) {
      await this.attachments?.attachInquiryAttachment(input.attachmentId, run.id);
    }
    return { runId: run.id, status: run.status, deduped: false };
  }
}

function pickReusable(stored: InquiryRun | null, refresh: boolean): InquiryRun | null {
  if (!stored) return null;
  if (refresh) return isInFlight(stored) ? stored : null;
  return isReusable(stored) ? stored : null;
}

function countsAgainstBudget(input: RequestInquiryRunInput, stored: InquiryRun | null): boolean {
  if (hasAtLeastRole(input.role, "admin")) return false;
  if (input.refresh && stored !== null) return false;
  return true;
}
