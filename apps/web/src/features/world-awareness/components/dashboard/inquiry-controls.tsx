import type { InquiryRunSummaryRecord } from "@/features/inquiry";
import type { WorldRefresh } from "../../hooks/use-world-awareness.ts";
import { InquiryPicker } from "./inquiry-picker.tsx";
import { RefreshControl } from "./refresh-control.tsx";

interface InquiryControlsProps {
  runs: InquiryRunSummaryRecord[];
  shownRun: InquiryRunSummaryRecord | null;
  onSelectRun: (runId: string) => void;
  refresh: WorldRefresh;
}

export function InquiryControls({ runs, shownRun, onSelectRun, refresh }: InquiryControlsProps) {
  return (
    <>
      <InquiryPicker runs={runs} shownRun={shownRun} onSelect={onSelectRun} />
      <RefreshControl refresh={refresh} />
    </>
  );
}
