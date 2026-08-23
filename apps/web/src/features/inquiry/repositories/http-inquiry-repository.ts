import { fetchJson } from "@/shared/http.ts";
import type {
  InquiryRepository,
  InquiryRunRecord,
  InquiryRunRequestInput,
  InquiryRunRequestRecord,
  InquiryRunSummaryRecord,
} from "./inquiry-repository.ts";

export class HttpInquiryRepository implements InquiryRepository {
  recentRuns(limit: number): Promise<InquiryRunSummaryRecord[]> {
    return fetchJson<InquiryRunSummaryRecord[]>(`/api/inquiry/runs?limit=${limit}`);
  }

  runById(runId: string): Promise<InquiryRunRecord> {
    return fetchJson<InquiryRunRecord>(`/api/inquiry/runs/${encodeURIComponent(runId)}`);
  }

  requestRun(request: InquiryRunRequestInput): Promise<InquiryRunRequestRecord> {
    return fetchJson<InquiryRunRequestRecord>("/api/inquiry/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  }
}
