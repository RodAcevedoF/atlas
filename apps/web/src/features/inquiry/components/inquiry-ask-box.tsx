import { CTA_PRIMARY, PANEL_GLASS } from "@/shared/ui";
import type { InquiryRunStatus } from "@atlas/domain";
import { Button, cn } from "@atlas/ui";
import { type FormEvent, useState } from "react";
import { useInquiryAsk } from "../hooks/use-inquiry-ask.ts";
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
  const [question, setQuestion] = useState("");
  const message = askMessage(state);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (state.isAsking || !question.trim()) return;
    ask(question);
    setQuestion("");
  };

  return (
    <div
      className={cn(
        PANEL_GLASS,
        "border border-transparent p-2 transition-colors focus-within:border-ring/50",
      )}
    >
      <form onSubmit={submit} className="flex items-center gap-2">
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
          disabled={state.isAsking || question.trim().length === 0}
          className={cn(CTA_PRIMARY, "shrink-0 font-semibold")}
        >
          Ask
        </Button>
      </form>

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
