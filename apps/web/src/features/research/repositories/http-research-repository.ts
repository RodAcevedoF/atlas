import { fetchJson } from "@/shared/http.ts";
import type { ResearchRepository, ResearchRunRecord } from "./research-repository.ts";

export class HttpResearchRepository implements ResearchRepository {
  async latestRun(): Promise<ResearchRunRecord | null> {
    const runs = await fetchJson<ResearchRunRecord[]>("/api/research/runs?limit=1");
    return runs[0] ?? null;
  }
}
