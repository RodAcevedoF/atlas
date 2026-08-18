import { fetchJson } from "@/shared/http.ts";
import type { ResearchRepository, ResearchRunRecord } from "./research-repository.ts";

export class HttpResearchRepository implements ResearchRepository {
  recentRuns(limit: number): Promise<ResearchRunRecord[]> {
    return fetchJson<ResearchRunRecord[]>(`/api/research/runs?limit=${limit}`);
  }
}
