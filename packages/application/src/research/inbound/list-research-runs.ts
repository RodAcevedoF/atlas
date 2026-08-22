import type { ResearchRunSummary } from "@atlas/domain";
import { toResearchRunSummary } from "@atlas/domain";
import type { ResearchRunStorePort } from "../outbound/research-run-store.ts";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export interface ResearchRunFilter {
  limit?: number;
}

export interface ListResearchRuns {
  execute(filter?: ResearchRunFilter): Promise<ResearchRunSummary[]>;
}

export class ListResearchRunsUseCase implements ListResearchRuns {
  constructor(private readonly store: ResearchRunStorePort) {}

  async execute(filter: ResearchRunFilter = {}): Promise<ResearchRunSummary[]> {
    const runs = await this.store.listResearchRuns({
      limit: Math.min(filter.limit || DEFAULT_LIMIT, MAX_LIMIT),
    });
    return runs.map(toResearchRunSummary);
  }
}
