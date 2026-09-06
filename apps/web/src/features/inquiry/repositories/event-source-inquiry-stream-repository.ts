import type { InquiryRunRecord } from "./inquiry-repository.ts";
import type {
  InquiryRunStreamHandle,
  InquiryRunStreamListeners,
  InquiryStreamRepository,
} from "./inquiry-stream-repository.ts";

export class EventSourceInquiryStreamRepository implements InquiryStreamRepository {
  openRunStream(runId: string, listeners: InquiryRunStreamListeners): InquiryRunStreamHandle {
    const source = new EventSource(`/api/inquiry/runs/${encodeURIComponent(runId)}/events`, {
      withCredentials: true,
    });

    source.onmessage = (event: MessageEvent<string>) => {
      let run: InquiryRunRecord;
      try {
        run = JSON.parse(event.data) as InquiryRunRecord;
      } catch {
        source.close();
        listeners.onDown();
        return;
      }
      listeners.onSnapshot(run);
    };

    source.onerror = () => {
      source.close();
      listeners.onDown();
    };

    return { close: () => source.close() };
  }
}
