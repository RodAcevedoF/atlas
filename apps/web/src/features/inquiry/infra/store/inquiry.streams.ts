import type { AppStore } from "@/store/index.ts";
import type { InquiryRunWatch, WatchInquiryRunStream } from "../../use-cases/stream-inquiry-run.ts";
import { isInquiryRunWatchable } from "../../use-cases/watch-inquiry-run.ts";
import { inquiryRunSnapshotReceived, inquiryRunWatchLost } from "./inquiry.commands.ts";
import { selectInquiry } from "./inquiry.slice.ts";

export function attachInquiryRunStreams(store: AppStore, watch: WatchInquiryRunStream): () => void {
  const watches = new Map<string, InquiryRunWatch>();

  const sync = () => {
    const { runs } = selectInquiry(store.getState());
    const listed = new Set(runs.map((run) => run.id));
    for (const [runId, active] of watches) {
      if (listed.has(runId)) continue;
      active.stop();
      watches.delete(runId);
    }
    for (const run of runs) {
      if (!isInquiryRunWatchable(run.status) || watches.has(run.id)) continue;
      watches.set(
        run.id,
        watch(
          run.id,
          (snapshot) => store.dispatch(inquiryRunSnapshotReceived(snapshot)),
          () => store.dispatch(inquiryRunWatchLost(run.id)),
        ),
      );
    }
  };

  sync();
  const unsubscribe = store.subscribe(sync);

  return () => {
    unsubscribe();
    for (const active of watches.values()) active.stop();
    watches.clear();
  };
}
