import type { InquiryRunId, InquiryRunList, InquiryRunListRow } from "@atlas/domain";
import { toInquiryRunSummary } from "@atlas/domain";
import type { InquiryRunStorePort } from "../outbound/inquiry-run-store.ts";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export interface InquiryRunFilter {
  limit?: number;
}

export interface ListInquiryRuns {
  execute(filter?: InquiryRunFilter): Promise<InquiryRunList>;
}

export class ListInquiryRunsUseCase implements ListInquiryRuns {
  constructor(
    private readonly store: InquiryRunStorePort,
    private readonly pinnedRunId: InquiryRunId | null,
  ) {}

  async execute(filter: InquiryRunFilter = {}): Promise<InquiryRunList> {
    const page = await this.store.listInquiryRuns({
      limit: Math.min(filter.limit || DEFAULT_LIMIT, MAX_LIMIT),
    });
    const rows = await this.withPinnedRun(page);
    return {
      runs: rows.map(toInquiryRunSummary),
      pinnedRunId: rows.some((row) => row.id === this.pinnedRunId) ? this.pinnedRunId : null,
    };
  }

  private async withPinnedRun(page: InquiryRunListRow[]): Promise<InquiryRunListRow[]> {
    const pinnedRunId = this.pinnedRunId;
    if (!pinnedRunId) return page;
    if (page.some((row) => row.id === pinnedRunId)) return page;

    const pinned = await this.store.findInquiryRunListRowById(pinnedRunId);
    return pinned ? [...page, pinned] : page;
  }
}
