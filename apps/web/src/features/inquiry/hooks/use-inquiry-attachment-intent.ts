import { useCallback, useMemo, useState } from "react";
import type { AttachmentInterpretationRecord } from "../repositories/inquiry-repository.ts";
import {
  type AttachmentIntentStage,
  MAX_ATTACHMENT_INTENT_STEPS,
  buildAttachmentFollowUpContext,
  resolveAttachmentIntentStage,
} from "../use-cases/attachment-intent.ts";
import { useInquiryAttachment } from "./use-inquiry-attachment.ts";

export interface AttachmentIntentSubmission {
  question: string;
  attachmentId?: string;
}

export function useInquiryAttachmentIntent() {
  const attachment = useInquiryAttachment();
  const {
    id,
    interpretation,
    interpretationCount,
    status,
    interpret,
    upload: uploadAttachment,
    remove: removeAttachment,
  } = attachment;
  const [question, setQuestion] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [refinementQuestion, setRefinementQuestion] = useState("");
  const [isRefining, setIsRefining] = useState(false);

  const stage = useMemo<AttachmentIntentStage>(() => {
    return resolveAttachmentIntentStage({
      id,
      status,
      interpretation,
      interpretationCount,
      isRefining,
    });
  }, [id, interpretation, interpretationCount, isRefining, status]);

  const applyInterpretation = useCallback((result: AttachmentInterpretationRecord | null) => {
    if (!result) return;
    setIsRefining(false);
    setQuestion(result.needsClarification ? "" : result.proposedQuestion);
  }, []);

  const advance = useCallback(async (): Promise<AttachmentIntentSubmission | null> => {
    const trimmed = question.trim();
    if (stage === "idle") return trimmed ? { question: trimmed } : null;
    if (stage === "reviewing" && id) {
      return trimmed ? { question: trimmed, attachmentId: id } : null;
    }
    if (stage === "ready") {
      setOriginalText(trimmed);
      applyInterpretation(await interpret(trimmed));
      return null;
    }
    if ((stage === "clarifying" || stage === "refining") && interpretation) {
      const context = buildAttachmentFollowUpContext({
        kind: stage === "clarifying" ? "clarification" : "refinement",
        originalText,
        interpretation:
          stage === "refining"
            ? { ...interpretation, proposedQuestion: refinementQuestion }
            : interpretation,
        userText: trimmed,
      });
      applyInterpretation(await interpret(context));
    }
    return null;
  }, [
    applyInterpretation,
    id,
    interpret,
    interpretation,
    originalText,
    question,
    refinementQuestion,
    stage,
  ]);

  const refine = useCallback(() => {
    if (stage !== "reviewing" || interpretationCount >= MAX_ATTACHMENT_INTENT_STEPS) return;
    setRefinementQuestion(question);
    setIsRefining(true);
    setQuestion("");
  }, [interpretationCount, question, stage]);

  const resetLocal = useCallback(() => {
    setQuestion("");
    setOriginalText("");
    setRefinementQuestion("");
    setIsRefining(false);
  }, []);

  const upload = useCallback(
    (file: File) => {
      resetLocal();
      uploadAttachment(file);
    },
    [resetLocal, uploadAttachment],
  );

  const remove = useCallback(() => {
    resetLocal();
    removeAttachment();
  }, [removeAttachment, resetLocal]);

  const submitted = useCallback(() => {
    resetLocal();
  }, [resetLocal]);

  return {
    ...attachment,
    question,
    setQuestion,
    stage,
    advance,
    refine,
    upload,
    remove,
    submitted,
  };
}
