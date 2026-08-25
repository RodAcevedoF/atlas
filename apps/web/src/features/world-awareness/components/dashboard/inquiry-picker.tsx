import { type InquiryRunSummaryRecord, RunList } from "@/features/inquiry";
import { Picker } from "@/shared/ui";
import { useCallback } from "react";

const EMPTY = "No runs yet";

interface InquiryPickerProps {
  runs: InquiryRunSummaryRecord[];
  shownRun: InquiryRunSummaryRecord | null;
  onSelect: (runId: string) => void;
}

interface PickerRunListProps extends InquiryPickerProps {
  close: () => void;
}

function PickerRunList({ runs, shownRun, onSelect, close }: PickerRunListProps) {
  const selectAndClose = useCallback(
    (runId: string) => {
      onSelect(runId);
      close();
    },
    [onSelect, close],
  );

  return <RunList runs={runs} selectedId={shownRun?.id ?? null} onSelect={selectAndClose} />;
}

export function InquiryPicker({ runs, shownRun, onSelect }: InquiryPickerProps) {
  return (
    <Picker
      label="Pick an inquiry"
      title="recent inquiries"
      trigger={shownRun?.question ?? EMPTY}
      disabled={runs.length === 0}
    >
      {(close) => (
        <PickerRunList runs={runs} shownRun={shownRun} onSelect={onSelect} close={close} />
      )}
    </Picker>
  );
}
