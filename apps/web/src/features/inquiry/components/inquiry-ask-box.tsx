import { CTA_PRIMARY, PANEL_GLASS } from "@/shared/ui";
import type { InquiryRunStatus } from "@atlas/domain";
import { Button, cn } from "@atlas/ui";
import { LoaderCircle, Paperclip, Plus, RefreshCw, Sparkles, X } from "lucide-react";
import { type ChangeEvent, type FormEvent, useRef } from "react";
import { useInquiryAsk } from "../hooks/use-inquiry-ask.ts";
import { useInquiryAttachmentIntent } from "../hooks/use-inquiry-attachment-intent.ts";
import { useInquiryBudget } from "../hooks/use-inquiry-budget.ts";
import type { InquiryAskState } from "../infra/store/inquiry.slice.ts";
import { INQUIRY_QUESTION_MAX_CHARS } from "../use-cases/request-inquiry-run.ts";
import { AttachmentThinkingState } from "./attachment-thinking-state.tsx";

type MessageTone = "working" | "error" | "info";

interface AskMessage {
  text: string;
  tone: MessageTone;
}

const SENDING: AskMessage = { text: "Sending your question…", tone: "working" };
const STILL_RUNNING: AskMessage = {
  text: "Still running. It keeps going in the background — reload to pick it up when it lands.",
  tone: "working",
};
const LOST_WATCH =
  "Lost track of your run — it keeps going in the background. Reload to pick it up.";
const DEDUPED: AskMessage = {
  text: "You already asked this today — showing the run you already have.",
  tone: "info",
};

const WATCHED_STATUS: Record<InquiryRunStatus, AskMessage> = {
  queued: { text: "Queued — waiting to start.", tone: "working" },
  running: { text: "Reading claims across the world's press.", tone: "working" },
  succeeded: { text: "Placed — painting the map.", tone: "info" },
  no_coverage: { text: "No claims found for that question.", tone: "info" },
  below_floor: { text: "Claims found, but none could be placed on the map.", tone: "info" },
  failed_retryable: { text: "That run failed. It is due to retry.", tone: "error" },
  failed_permanent: {
    text: "That run failed and will not retry. Try rewording your question.",
    tone: "error",
  },
};

const TONE_DOT: Record<MessageTone, string> = {
  working: "bg-primary animate-pulse motion-reduce:animate-none",
  error: "bg-destructive",
  info: "bg-muted-foreground/70",
};

const TONE_TEXT: Record<MessageTone, string> = {
  working: "text-muted-foreground",
  error: "text-destructive",
  info: "text-muted-foreground",
};

const PRIMARY_LABEL = {
  idle: "Ask",
  uploading: "Preparing",
  ready: "Read file",
  interpreting: "Thinking",
  clarifying: "Answer",
  reviewing: "Ask this",
  refining: "Reformulate",
  ended: "Needs context",
} as const;

const PLACEHOLDER = {
  idle: "Where are wildfires burning right now?",
  uploading: "Preparing your attachment…",
  ready: "Add a research angle, or let Atlas decide",
  interpreting: "Atlas is drafting a research question…",
  clarifying: "Type your answer…",
  reviewing: "Review or edit the suggested question",
  refining: "How should Atlas change the question?",
  ended: "Remove the file and try again with a clearer request",
} as const;

function askMessage(state: InquiryAskState): AskMessage | null {
  if (state.isRefresh) return null;
  if (state.isStillRunning && state.error) {
    return { text: `${LOST_WATCH} ${state.error}`, tone: "error" };
  }
  if (state.isStillRunning) return STILL_RUNNING;
  if (state.error) return { text: state.error, tone: "error" };
  if (state.watchedStatus) return WATCHED_STATUS[state.watchedStatus];
  if (state.isAsking) return SENDING;
  if (state.wasDeduped) return DEDUPED;
  return null;
}

export function InquiryAskBox() {
  const { ask, ...state } = useInquiryAsk();
  const intent = useInquiryAttachmentIntent();
  const budget = useInquiryBudget();
  const fileInput = useRef<HTMLInputElement>(null);
  const message = askMessage(state);
  const remaining = budget?.remaining ?? null;
  const atCap = remaining === 0;
  const attachmentBusy = intent.stage === "uploading" || intent.stage === "interpreting";
  const finalSubmission = intent.stage === "idle" || intent.stage === "reviewing";
  const needsResponse = intent.stage === "clarifying" || intent.stage === "refining";
  const cannotSubmit =
    state.isAsking ||
    attachmentBusy ||
    intent.stage === "ended" ||
    (needsResponse && !intent.question.trim()) ||
    (finalSubmission && (atCap || !intent.question.trim()));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (cannotSubmit) return;
    const submission = await intent.advance();
    if (!submission) return;
    ask(submission.question, submission.attachmentId);
    intent.submitted();
  };

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) intent.upload(file);
  };

  return (
    <div
      className={cn(
        PANEL_GLASS,
        "border border-transparent p-2 transition-colors focus-within:border-ring/50",
      )}
    >
      <form onSubmit={(event) => void submit(event)} className="flex items-center gap-2">
        <input
          ref={fileInput}
          type="file"
          accept=".csv,.xlsx,.jpg,.jpeg,.png,.webp,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png,image/webp"
          onChange={selectFile}
          className="sr-only"
          aria-label="Choose a CSV, Excel, or image attachment"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Attach a file"
          disabled={attachmentBusy || intent.id !== null}
          onClick={() => fileInput.current?.click()}
          className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-card-foreground"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <input
          aria-label="Ask a question"
          placeholder={PLACEHOLDER[intent.stage]}
          value={intent.question}
          disabled={intent.stage === "interpreting" || intent.stage === "ended"}
          maxLength={INQUIRY_QUESTION_MAX_CHARS}
          onChange={(event) => intent.setQuestion(event.target.value)}
          className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-[15.5px] leading-tight tracking-[-0.01em] text-card-foreground outline-none placeholder:text-muted-foreground/80"
        />
        <Button
          type="submit"
          variant={null}
          size="pillSm"
          disabled={cannotSubmit}
          className={cn(CTA_PRIMARY, "shrink-0 font-semibold")}
        >
          {intent.stage === "ready" || intent.stage === "interpreting" ? (
            <Sparkles className="h-3.5 w-3.5" />
          ) : null}
          {PRIMARY_LABEL[intent.stage]}
        </Button>
      </form>

      {intent.filename ? (
        <div className="mx-3 mt-2 flex w-fit max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-lg border border-border/70 bg-background/50 px-2.5 py-1.5 text-xs text-card-foreground">
          {attachmentBusy ? (
            <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
          ) : (
            <Paperclip className="h-3.5 w-3.5 shrink-0 text-primary" />
          )}
          <span className="truncate">{intent.filename}</span>
          <button
            type="button"
            aria-label={`Remove ${intent.filename}`}
            disabled={attachmentBusy}
            onClick={intent.remove}
            className="rounded-sm text-muted-foreground transition-colors hover:text-card-foreground disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <AttachmentThinkingState stage={intent.stage} />

      {intent.stage === "reviewing" && intent.interpretation ? (
        <div className="mx-3 mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/35 px-3 py-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
              Suggested research question
            </p>
            <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
              {intent.interpretation.summary}
            </p>
          </div>
          {intent.interpretationCount < 3 ? (
            <Button type="button" variant="ghost" size="sm" onClick={intent.refine}>
              <RefreshCw className="h-3.5 w-3.5" />
              Reformulate
            </Button>
          ) : null}
        </div>
      ) : null}

      {intent.stage === "clarifying" && intent.interpretation ? (
        <p className="px-3 pb-1 pt-2 text-[11.5px] text-muted-foreground">
          <span className="font-medium text-card-foreground">Atlas needs one detail: </span>
          {intent.interpretation.clarificationQuestion}
        </p>
      ) : null}

      {intent.stage === "refining" ? (
        <p className="px-3 pb-1 pt-2 text-[11.5px] text-muted-foreground">
          Tell Atlas what to emphasize, narrow, or rewrite. This makes one more interpretation pass.
        </p>
      ) : null}

      {intent.stage === "ended" ? (
        <p className="px-3 pb-1 pt-2 text-[11.5px] text-destructive">
          Atlas still cannot identify one research question after three passes. Remove the file and
          try again with clearer context.
        </p>
      ) : null}

      {intent.error ? (
        <p className="px-3 pb-1 pt-2 text-[11.5px] text-destructive">{intent.error}</p>
      ) : null}

      {remaining !== null ? (
        <p className="px-3 pb-1 pt-2 text-[11.5px] text-muted-foreground">
          {atCap ? "No searches left today" : `${remaining} left today`}
        </p>
      ) : null}

      {message ? (
        <p
          className={cn(
            "flex items-start gap-2 px-3 pb-1 pt-2 text-[11.5px]",
            TONE_TEXT[message.tone],
          )}
        >
          <span
            aria-hidden="true"
            className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", TONE_DOT[message.tone])}
          />
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
