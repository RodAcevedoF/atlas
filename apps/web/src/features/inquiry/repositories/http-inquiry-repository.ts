import { fetchJson } from "@/shared/http.ts";
import type {
  InquiryRepository,
  InquiryRunListRecord,
  InquiryRunRecord,
  InquiryRunRequestInput,
  InquiryRunRequestRecord,
} from "./inquiry-repository.ts";

export class HttpInquiryRepository implements InquiryRepository {
  recentRuns(limit: number): Promise<InquiryRunListRecord> {
    return fetchJson<InquiryRunListRecord>(`/api/inquiry/runs?limit=${limit}`);
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
