import type { PublicResearchRun, ResearchRunId } from "@atlas/domain";
import { toPublicResearchRun } from "@atlas/domain";
import type { ResearchRunStorePort } from "../outbound/research-run-store.ts";

export interface GetResearchRun {
  execute(id: ResearchRunId): Promise<PublicResearchRun | null>;
}

export class GetResearchRunUseCase implements GetResearchRun {
  constructor(private readonly store: ResearchRunStorePort) {}

  async execute(id: ResearchRunId): Promise<PublicResearchRun | null> {
    const run = await this.store.findResearchRunById(id);
    return run ? toPublicResearchRun(run) : null;
  }
}
