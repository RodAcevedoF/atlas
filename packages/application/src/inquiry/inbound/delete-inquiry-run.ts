import type { InquiryRunId } from "@atlas/domain";
import type { InquiryRunStorePort } from "../outbound/inquiry-run-store.ts";

export type DeleteInquiryRunOutcome = "deleted" | "not_found" | "pinned";

export interface DeleteInquiryRun {
  execute(id: InquiryRunId): Promise<DeleteInquiryRunOutcome>;
}

export class DeleteInquiryRunUseCase implements DeleteInquiryRun {
  constructor(
    private readonly store: InquiryRunStorePort,
    private readonly pinnedRunId: InquiryRunId | null,
  ) {}

  async execute(id: InquiryRunId): Promise<DeleteInquiryRunOutcome> {
    if (this.pinnedRunId !== null && id === this.pinnedRunId) return "pinned";
    const deleted = await this.store.deleteInquiryRunById(id);
    return deleted ? "deleted" : "not_found";
  }
}
