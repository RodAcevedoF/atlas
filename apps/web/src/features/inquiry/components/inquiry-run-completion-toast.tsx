import type { InquiryRunStatus } from "@atlas/domain";
import { type ToastVariant, useToast } from "@atlas/ui";
import { useEffect, useRef } from "react";
import { useInquiryAsk } from "../hooks/use-inquiry-ask.ts";
import { isInquiryRunSettled } from "../use-cases/watch-inquiry-run.ts";

const COMPLETION_TOAST: Partial<
  Record<InquiryRunStatus, { message: string; variant: ToastVariant }>
> = {
  succeeded: { message: "Research complete — the map is ready.", variant: "success" },
  no_coverage: { message: "Research complete — no claims were found.", variant: "info" },
  below_floor: {
    message: "Research complete — no claims could be placed on the map.",
    variant: "info",
  },
  failed_retryable: { message: "Research failed and is due to retry.", variant: "error" },
  failed_permanent: { message: "Research failed. Try rewording your question.", variant: "error" },
} as const;

export function InquiryRunCompletionToast() {
  const { toast } = useToast();
  const { completion, isStillRunning, wasDeduped } = useInquiryAsk();
  const notifiedRunId = useRef<string | null>(null);

  useEffect(() => {
    if (!completion || isStillRunning || wasDeduped) return;
    if (!isInquiryRunSettled(completion.status) || notifiedRunId.current === completion.runId)
      return;

    const notification = COMPLETION_TOAST[completion.status];
    if (!notification) return;
    notifiedRunId.current = completion.runId;
    toast(notification.message, notification.variant);
  }, [completion, isStillRunning, toast, wasDeduped]);

  return null;
}
