import type { InquiryRunRecord } from "./inquiry-repository.ts";

export interface InquiryRunStreamListeners {
  onSnapshot(run: InquiryRunRecord): void;
  onDown(): void;
}

export interface InquiryRunStreamHandle {
  close(): void;
}

export interface InquiryStreamRepository {
  openRunStream(runId: string, listeners: InquiryRunStreamListeners): InquiryRunStreamHandle;
}
