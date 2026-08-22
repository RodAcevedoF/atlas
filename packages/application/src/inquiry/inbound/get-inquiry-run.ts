import type { InquiryRunId, PublicInquiryRun } from "@atlas/domain";
import { toPublicInquiryRun } from "@atlas/domain";
import type { InquiryRunStorePort } from "../outbound/inquiry-run-store.ts";

export interface GetInquiryRun {
  execute(id: InquiryRunId): Promise<PublicInquiryRun | null>;
}

export class GetInquiryRunUseCase implements GetInquiryRun {
  constructor(private readonly store: InquiryRunStorePort) {}

  async execute(id: InquiryRunId): Promise<PublicInquiryRun | null> {
    const run = await this.store.findInquiryRunById(id);
    return run ? toPublicInquiryRun(run) : null;
  }
}
