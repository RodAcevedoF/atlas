import type { InquiryRunRecord } from "../repositories/inquiry-repository.ts";
import type {
  InquiryRunStreamHandle,
  InquiryStreamRepository,
} from "../repositories/inquiry-stream-repository.ts";

export interface InquiryStreamPolicy {
  reconnectDelaysMs: readonly number[];
  retryReopenDelaysMs: readonly number[];
}

export const INQUIRY_STREAM_POLICY: InquiryStreamPolicy = {
  reconnectDelaysMs: [1_000, 5_000, 15_000, 30_000],
  retryReopenDelaysMs: [35_000, 15_000, 15_000, 15_000],
};

export interface InquiryRunWatch {
  stop(): void;
}

export type WatchInquiryRunStream = (
  runId: string,
  onSnapshot: (run: InquiryRunRecord) => void,
  onStalled: () => void,
) => InquiryRunWatch;

export interface StreamInquiryRunDeps {
  inquiryStreamRepository: InquiryStreamRepository;
}

export function makeWatchInquiryRunStream(
  { inquiryStreamRepository }: StreamInquiryRunDeps,
  policy: InquiryStreamPolicy,
): WatchInquiryRunStream {
  return (runId, onSnapshot, onStalled) => {
    let handle: InquiryRunStreamHandle | null = null;
    let reopenTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    let reconnectsUsed = 0;
    let retryReopensUsed = 0;

    const closeHandle = () => {
      handle?.close();
      handle = null;
    };

    const reopenAfter = (delayMs: number | undefined) => {
      if (delayMs === undefined || stopped) return;
      reopenTimer = setTimeout(open, delayMs);
    };

    const receive = (run: InquiryRunRecord) => {
      reconnectsUsed = 0;
      if (run.progress.stage !== "terminal") {
        retryReopensUsed = 0;
        onSnapshot(run);
        return;
      }
      onSnapshot(run);
      closeHandle();
      if (run.status !== "failed_retryable") return;
      reopenAfter(policy.retryReopenDelaysMs[retryReopensUsed]);
      retryReopensUsed += 1;
    };

    const resume = () => {
      closeHandle();
      const delayMs = policy.reconnectDelaysMs[reconnectsUsed];
      reconnectsUsed += 1;
      if (delayMs === undefined) {
        onStalled();
        return;
      }
      reopenAfter(delayMs);
    };

    const open = () => {
      if (stopped) return;
      handle = inquiryStreamRepository.openRunStream(runId, {
        onSnapshot: receive,
        onDown: resume,
      });
    };

    open();

    return {
      stop() {
        stopped = true;
        if (reopenTimer) clearTimeout(reopenTimer);
        closeHandle();
      },
    };
  };
}
