import type { ResearchRunSummary } from "@atlas/domain";
import { toResearchRunSummary } from "@atlas/domain";
import type { InquiryRunStorePort } from "../outbound/inquiry-run-store.ts";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export interface InquiryRunFilter {
  limit?: number;
}

export interface ListInquiryRuns {
  execute(filter?: InquiryRunFilter): Promise<ResearchRunSummary[]>;
}

export class ListInquiryRunsUseCase implements ListInquiryRuns {
  constructor(private readonly store: InquiryRunStorePort) {}

  async execute(filter: InquiryRunFilter = {}): Promise<ResearchRunSummary[]> {
    const runs = await this.store.listInquiryRuns({
      limit: Math.min(filter.limit || DEFAULT_LIMIT, MAX_LIMIT),
    });
    return runs.map(toResearchRunSummary);
  }
}
