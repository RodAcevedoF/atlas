import { CTA_PRIMARY, PANEL_GLASS } from "@/shared/ui";
import type { InquiryRunStatus } from "@atlas/domain";
import { Button, cn } from "@atlas/ui";
import { LoaderCircle, Paperclip, Plus, X } from "lucide-react";
import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { useInquiryAsk } from "../hooks/use-inquiry-ask.ts";
import { useInquiryAttachment } from "../hooks/use-inquiry-attachment.ts";
import { useInquiryBudget } from "../hooks/use-inquiry-budget.ts";
import type { InquiryAskState } from "../infra/store/inquiry.slice.ts";
import { INQUIRY_QUESTION_MAX_CHARS } from "../use-cases/request-inquiry-run.ts";

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
  const attachment = useInquiryAttachment();
  const budget = useInquiryBudget();
  const [question, setQuestion] = useState("");
  const [initialAttachmentText, setInitialAttachmentText] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const message = askMessage(state);
  const remaining = budget?.remaining ?? null;
  const atCap = remaining === 0;
  const needsInterpretation =
    attachment.id !== null &&
    (attachment.interpretation === null || attachment.interpretation.needsClarification);
  const clarificationEnded =
    attachment.interpretation?.needsClarification === true && attachment.interpretationCount >= 2;
  const attachmentBusy = attachment.status === "uploading" || attachment.status === "interpreting";
  const needsClarificationAnswer = attachment.interpretation?.needsClarification === true;
  const cannotSubmit =
    state.isAsking ||
    attachmentBusy ||
    clarificationEnded ||
    (needsClarificationAnswer && !question.trim()) ||
    (!needsInterpretation && (atCap || !question.trim())) ||
    (attachment.status === "uploading" && attachment.id === null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (cannotSubmit) return;
    if (needsInterpretation) {
      const firstPass = attachment.interpretationCount === 0;
      const userText = firstPass
        ? question
        : `Initial request: ${initialAttachmentText}\nAtlas asked: ${attachment.interpretation?.clarificationQuestion}\nAnswer: ${question}`;
      if (firstPass) setInitialAttachmentText(question);
      const interpreted = await attachment.interpret(userText);
      if (!interpreted) return;
      setQuestion(interpreted.needsClarification ? "" : interpreted.proposedQuestion);
      return;
    }
    ask(question, attachment.id ?? undefined);
    setQuestion("");
    setInitialAttachmentText("");
  };

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) attachment.upload(file);
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
          disabled={attachmentBusy || attachment.id !== null}
          onClick={() => fileInput.current?.click()}
          className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-card-foreground"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <input
          aria-label="Ask a question"
          placeholder="Where are wildfires burning right now?"
          value={question}
          maxLength={INQUIRY_QUESTION_MAX_CHARS}
          onChange={(event) => setQuestion(event.target.value)}
          className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-[15.5px] leading-tight tracking-[-0.01em] text-card-foreground outline-none placeholder:text-muted-foreground/80"
        />
        <Button
          type="submit"
          variant={null}
          size="pillSm"
          disabled={cannotSubmit}
          className={cn(CTA_PRIMARY, "shrink-0 font-semibold")}
        >
          {attachment.status === "interpreting"
            ? "Reading"
            : needsInterpretation
              ? "Read file"
              : "Ask"}
        </Button>
      </form>

      {attachment.filename ? (
        <div className="mx-3 mt-2 flex w-fit max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-lg border border-border/70 bg-background/50 px-2.5 py-1.5 text-xs text-card-foreground">
          {attachmentBusy ? (
            <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
          ) : (
            <Paperclip className="h-3.5 w-3.5 shrink-0 text-primary" />
          )}
          <span className="truncate">{attachment.filename}</span>
          <button
            type="button"
            aria-label={`Remove ${attachment.filename}`}
            disabled={attachmentBusy}
            onClick={attachment.remove}
            className="rounded-sm text-muted-foreground transition-colors hover:text-card-foreground disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {attachment.interpretation && !attachment.interpretation.needsClarification ? (
        <p className="px-3 pb-1 pt-2 text-[11.5px] text-muted-foreground">
          Review the suggested research question, then Ask.
        </p>
      ) : null}

      {attachment.interpretation?.needsClarification ? (
        <p className="px-3 pb-1 pt-2 text-[11.5px] text-muted-foreground">
          {clarificationEnded
            ? "Atlas still cannot identify one research question. Remove the file and try again with a clearer request."
            : attachment.interpretation.clarificationQuestion}
        </p>
      ) : null}

      {attachment.error ? (
        <p className="px-3 pb-1 pt-2 text-[11.5px] text-destructive">{attachment.error}</p>
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
