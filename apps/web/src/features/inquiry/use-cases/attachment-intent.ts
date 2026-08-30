import type { InquiryAttachmentStatus } from "../infra/store/inquiry.slice.ts";
import type { AttachmentInterpretationRecord } from "../repositories/inquiry-repository.ts";

export const MAX_ATTACHMENT_INTENT_STEPS = 3;
const FOLLOW_UP_ORIGINAL_CHARS = 200;
const FOLLOW_UP_SUMMARY_CHARS = 250;
const FOLLOW_UP_QUESTION_CHARS = 350;
const FOLLOW_UP_USER_TEXT_CHARS = 350;

export type AttachmentIntentStage =
  | "idle"
  | "uploading"
  | "ready"
  | "interpreting"
  | "clarifying"
  | "reviewing"
  | "refining"
  | "ended";

type FollowUpKind = "clarification" | "refinement";

interface FollowUpContext {
  kind: FollowUpKind;
  originalText: string;
  interpretation: AttachmentInterpretationRecord;
  userText: string;
}

interface ResolveAttachmentIntentStageInput {
  id: string | null;
  status: InquiryAttachmentStatus;
  interpretation: AttachmentInterpretationRecord | null;
  interpretationCount: number;
  isRefining: boolean;
}

export function resolveAttachmentIntentStage(
  input: ResolveAttachmentIntentStageInput,
): AttachmentIntentStage {
  if (input.status === "uploading") return "uploading";
  if (input.status === "interpreting") return "interpreting";
  if (!input.id) return "idle";
  if (!input.interpretation) return "ready";
  if (input.interpretation.needsClarification) {
    return input.interpretationCount >= MAX_ATTACHMENT_INTENT_STEPS ? "ended" : "clarifying";
  }
  return input.isRefining ? "refining" : "reviewing";
}

export function buildAttachmentFollowUpContext(input: FollowUpContext): string {
  const originalText = input.originalText.slice(0, FOLLOW_UP_ORIGINAL_CHARS);
  const summary = input.interpretation.summary.slice(0, FOLLOW_UP_SUMMARY_CHARS);
  const proposedQuestion = input.interpretation.proposedQuestion.slice(0, FOLLOW_UP_QUESTION_CHARS);
  const userText = input.userText.slice(0, FOLLOW_UP_USER_TEXT_CHARS);
  const clarificationQuestion = input.interpretation.clarificationQuestion?.slice(
    0,
    FOLLOW_UP_QUESTION_CHARS,
  );
  const instruction =
    input.kind === "clarification"
      ? `Atlas asked: ${clarificationQuestion}\nUser answered: ${userText}`
      : `User wants this reformulated: ${userText}`;
  return [
    `Original request: ${originalText || "No initial text"}`,
    `Current summary: ${summary}`,
    `Current proposed question: ${proposedQuestion}`,
    instruction,
    "Return one revised Atlas research question, or one short clarification if intent is still unclear.",
  ].join("\n");
}
