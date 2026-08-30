import type { AttachmentIntentStage } from "../use-cases/attachment-intent.ts";

const COPY = {
  uploading: {
    title: "Preparing attachment",
    steps: ["Secure upload", "Validate file", "Prepare context"],
  },
  interpreting: {
    title: "Building a research question",
    steps: ["Read evidence", "Find entities", "Draft intent"],
  },
} as const;

export function AttachmentThinkingState({ stage }: { stage: AttachmentIntentStage }) {
  if (stage !== "uploading" && stage !== "interpreting") return null;
  const copy = COPY[stage];
  return (
    <div className="mx-3 mt-2 overflow-hidden rounded-xl border border-primary/15 bg-primary/[0.045] px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11.5px] font-medium text-card-foreground">{copy.title}</p>
        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-primary">
          In progress
        </span>
      </div>
      <div aria-hidden="true" className="mt-2 h-1 overflow-hidden rounded-full bg-primary/10">
        <span className="atlas4-progress block h-full w-1/3 rounded-full bg-primary/80" />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {copy.steps.map((step) => (
          <span key={step} className="truncate text-center text-[9.5px] text-muted-foreground">
            {step}
          </span>
        ))}
      </div>
    </div>
  );
}
