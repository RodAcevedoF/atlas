import type { PublicResearchRun, ResearchRunId } from "@atlas/domain";
import { toPublicResearchRun } from "@atlas/domain";
import type { InquiryRunStorePort } from "../outbound/inquiry-run-store.ts";

export interface GetInquiryRun {
  execute(id: ResearchRunId): Promise<PublicResearchRun | null>;
}

export class GetInquiryRunUseCase implements GetInquiryRun {
  constructor(private readonly store: InquiryRunStorePort) {}

  async execute(id: ResearchRunId): Promise<PublicResearchRun | null> {
    const run = await this.store.findInquiryRunById(id);
    return run ? toPublicResearchRun(run) : null;
  }
}
