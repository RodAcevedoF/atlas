import type {
  InquiryRunActor,
  InquiryRunId,
  InquiryRunList,
  InquiryRunListRow,
  UserId,
} from "@atlas/domain";
import { makeUserId, mayActOnInquiryRun, toInquiryRunSummary } from "@atlas/domain";
import type { InquiryRunStorePort } from "../outbound/inquiry-run-store.ts";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export interface InquiryRunFilter {
  limit?: number;
}

export interface ListInquiryRuns {
  execute(actor: InquiryRunActor, filter?: InquiryRunFilter): Promise<InquiryRunList>;
}

export class ListInquiryRunsUseCase implements ListInquiryRuns {
  constructor(
    private readonly store: InquiryRunStorePort,
    private readonly pinnedRunId: InquiryRunId | null,
  ) {}

  async execute(actor: InquiryRunActor, filter: InquiryRunFilter = {}): Promise<InquiryRunList> {
    const page = await this.store.listInquiryRuns({
      limit: Math.min(filter.limit || DEFAULT_LIMIT, MAX_LIMIT),
      ownerId: ownerScope(actor),
    });
    const rows = await this.withPinnedRun(page, actor);
    return {
      runs: rows.map(toInquiryRunSummary),
      pinnedRunId: rows.some((row) => row.id === this.pinnedRunId) ? this.pinnedRunId : null,
    };
  }

  private async withPinnedRun(
    page: InquiryRunListRow[],
    actor: InquiryRunActor,
  ): Promise<InquiryRunListRow[]> {
    const pinnedRunId = this.pinnedRunId;
    if (!pinnedRunId) return page;
    if (page.some((row) => row.id === pinnedRunId)) return page;

    const pinned = await this.store.findInquiryRunListRowById(pinnedRunId);
    return pinned && mayActOnInquiryRun(pinned, actor) ? [...page, pinned] : page;
  }
}

function ownerScope(actor: InquiryRunActor): UserId | null {
  return actor.role === "super_admin" ? null : makeUserId(actor.id);
}
