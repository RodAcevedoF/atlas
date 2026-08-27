import type { InquiryRunActor, InquiryRunId, UserId } from "@atlas/domain";
import { mayActOnInquiryRun } from "@atlas/domain";
import type { InquiryRunStorePort } from "../outbound/inquiry-run-store.ts";

export type DeleteInquiryRunOutcome = "deleted" | "not_found" | "pinned" | "forbidden";

export interface InquiryActor extends InquiryRunActor {
  id: UserId;
}

export interface DeleteInquiryRun {
  execute(id: InquiryRunId, actor: InquiryActor): Promise<DeleteInquiryRunOutcome>;
}

export class DeleteInquiryRunUseCase implements DeleteInquiryRun {
  constructor(
    private readonly store: InquiryRunStorePort,
    private readonly pinnedRunId: InquiryRunId | null,
  ) {}

  async execute(id: InquiryRunId, actor: InquiryActor): Promise<DeleteInquiryRunOutcome> {
    if (this.pinnedRunId !== null && id === this.pinnedRunId) return "pinned";

    const run = await this.store.findInquiryRunById(id);
    if (!run) return "not_found";
    if (!mayActOnInquiryRun(run, actor)) return "forbidden";

    const deleted = await this.store.deleteInquiryRunById(id);
    return deleted ? "deleted" : "not_found";
  }
}
