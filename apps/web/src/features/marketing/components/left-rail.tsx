import { useScrollProgress } from "@/shared/editorial/use-scroll-progress.ts";

export function LeftRail() {
  const progress = useScrollProgress();

  return (
    <div className="fixed inset-y-0 left-0 z-60 hidden w-13.5 flex-col items-center justify-between border-r border-border bg-background py-4.5 md:flex">
      <div className="relative h-5.5 w-5.5 border border-primary">
        <span className="absolute inset-1.25 bg-primary" />
      </div>
      <div className="relative my-5.5 w-px flex-1 bg-border">
        <span
          className="absolute -left-px top-0 w-0.75 bg-primary"
          style={{ height: `${progress}%` }}
        />
      </div>
      <div className="pb-2 font-mono text-[8px] uppercase tracking-[0.34em] text-faint [writing-mode:vertical-rl]">
        Coverage × Conviction
      </div>
    </div>
  );
}
