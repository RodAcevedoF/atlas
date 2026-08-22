import type { InquiryRunStatus } from "@atlas/domain";
import { cn } from "@atlas/ui";
import { type FormEvent, useState } from "react";
import { useInquiryAsk } from "../hooks/use-inquiry-ask.ts";
import type { InquiryAskState } from "../infra/store/inquiry.slice.ts";
import { INQUIRY_QUESTION_MAX_CHARS } from "../use-cases/request-inquiry-run.ts";

const SENDING = "Sending your question…";
const STILL_RUNNING =
  "Still running. It keeps going in the background — reload to pick it up when it lands.";
const LOST_WATCH =
  "Lost track of your run — it keeps going in the background. Reload to pick it up.";
const DEDUPED = "You already asked this today — showing the run you already have.";

const WATCHED_STATUS: Record<InquiryRunStatus, string> = {
  queued: "Queued — waiting for the worker to pick it up.",
  running: "Running — measuring coverage across GDELT.",
  succeeded: "Measured — painting the map.",
  no_coverage: "No measurable coverage found for that question.",
  below_floor: "Too little coverage to plot honestly.",
  failed_retryable: "That run failed and is due to retry.",
  failed_permanent: "That run failed and will not retry.",
};

interface AskMessage {
  text: string;
  isError: boolean;
}

function askMessage(state: InquiryAskState): AskMessage | null {
  if (state.isStillRunning && state.error) {
    return { text: `${LOST_WATCH} ${state.error}`, isError: true };
  }
  if (state.isStillRunning) return { text: STILL_RUNNING, isError: false };
  if (state.error) return { text: state.error, isError: true };
  if (state.watchedStatus) return { text: WATCHED_STATUS[state.watchedStatus], isError: false };
  if (state.isAsking) return { text: SENDING, isError: false };
  if (state.wasDeduped) return { text: DEDUPED, isError: false };
  return null;
}

export function InquiryAskBox({ onAsk }: { onAsk: () => void }) {
  const { ask, ...state } = useInquiryAsk();
  const [question, setQuestion] = useState("");
  const message = askMessage(state);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (state.isAsking || !question.trim()) return;
    ask(question);
    onAsk();
    setQuestion("");
  };

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card/80 p-1.5 backdrop-blur-md">
      <form onSubmit={submit} className="flex items-center gap-1.5">
        <input
          aria-label="Inquiry question"
          placeholder="Ask the map — who is covering the Sudan conflict?"
          value={question}
          maxLength={INQUIRY_QUESTION_MAX_CHARS}
          onChange={(event) => setQuestion(event.target.value)}
          className="min-w-0 flex-1 rounded-[9px] bg-transparent px-2.5 py-1.5 text-[12.5px] text-card-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={state.isAsking || question.trim().length === 0}
          className="rounded-[9px] bg-primary px-3.5 py-1.5 text-[12px] font-semibold text-primary-foreground transition-[filter] hover:brightness-[1.07] disabled:opacity-45"
        >
          Ask
        </button>
      </form>

      {message ? (
        <p
          className={cn(
            "px-2.5 pb-0.5 text-[11px]",
            message.isError ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
