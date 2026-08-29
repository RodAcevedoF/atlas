import { fetchJson, fetchNoContent } from "@/shared/http.ts";
import type {
  AttachmentInterpretationRecord,
  InquiryAttachmentRecord,
  InquiryBudgetRecord,
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

  deleteRun(runId: string): Promise<void> {
    return fetchNoContent(`/api/inquiry/runs/${encodeURIComponent(runId)}`, { method: "DELETE" });
  }

  requestRun(request: InquiryRunRequestInput): Promise<InquiryRunRequestRecord> {
    return fetchJson<InquiryRunRequestRecord>("/api/inquiry/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  }

  budget(): Promise<InquiryBudgetRecord> {
    return fetchJson<InquiryBudgetRecord>("/api/inquiry/budget");
  }

  uploadAttachment(file: File): Promise<InquiryAttachmentRecord> {
    return fetchJson<InquiryAttachmentRecord>("/api/inquiry/attachments", {
      method: "POST",
      headers: {
        "Content-Type": mediaTypeFor(file.name),
        "X-Atlas-Filename": encodeURIComponent(file.name),
      },
      body: file,
    });
  }

  interpretAttachment(id: string, question: string): Promise<AttachmentInterpretationRecord> {
    return fetchJson<AttachmentInterpretationRecord>(
      `/api/inquiry/attachments/${encodeURIComponent(id)}/interpret`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      },
    );
  }

  deleteAttachment(id: string): Promise<void> {
    return fetchNoContent(`/api/inquiry/attachments/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }
}

function mediaTypeFor(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv")) return "text/csv";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}
