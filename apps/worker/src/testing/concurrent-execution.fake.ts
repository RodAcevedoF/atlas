import type { ExecuteInquiryRun, ExecuteInquiryRunOutput } from "@atlas/application";
import type { InquiryRunId } from "@atlas/domain";

export class ConcurrentExecution implements ExecuteInquiryRun {
  active = 0;
  peak = 0;
  completed: InquiryRunId[] = [];

  constructor(
    private readonly pause: Promise<void> | null = null,
    readonly waiting: InquiryRunId[] = [],
  ) {}

  async execute(runId?: InquiryRunId): Promise<ExecuteInquiryRunOutput> {
    const claimed = runId ?? this.waiting.shift() ?? null;
    this.active += 1;
    this.peak = Math.max(this.peak, this.active);
    await (this.pause ?? Bun.sleep(10));
    this.active -= 1;
    if (claimed) this.completed.push(claimed);
    return { runId: claimed, status: claimed ? "succeeded" : null };
  }
}
