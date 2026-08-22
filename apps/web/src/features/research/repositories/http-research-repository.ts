import { fetchJson } from "@/shared/http.ts";
import type {
  ResearchRepository,
  ResearchRunRecord,
  ResearchRunRequestRecord,
  ResearchRunSummaryRecord,
} from "./research-repository.ts";

export class HttpResearchRepository implements ResearchRepository {
  recentRuns(limit: number): Promise<ResearchRunSummaryRecord[]> {
    return fetchJson<ResearchRunSummaryRecord[]>(`/api/research/runs?limit=${limit}`);
  }

  runById(runId: string): Promise<ResearchRunRecord> {
    return fetchJson<ResearchRunRecord>(`/api/research/runs/${encodeURIComponent(runId)}`);
  }

  requestRun(question: string): Promise<ResearchRunRequestRecord> {
    return fetchJson<ResearchRunRequestRecord>("/api/research/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
  }
}
