import { type InquiryRunSummaryRecord, RunList } from "@/features/inquiry";
import { Picker } from "@/shared/ui";

const EMPTY = "No runs yet";

interface InquiryPickerProps {
  runs: InquiryRunSummaryRecord[];
  shownRun: InquiryRunSummaryRecord | null;
  onSelect: (runId: string) => void;
}

export function InquiryPicker({ runs, shownRun, onSelect }: InquiryPickerProps) {
  return (
    <Picker
      label="Pick an inquiry"
      title="Recent inquiries"
      trigger={shownRun?.question ?? EMPTY}
      disabled={runs.length === 0}
    >
      {(close) => (
        <RunList
          runs={runs}
          selectedId={shownRun?.id ?? null}
          onSelect={(runId) => {
            onSelect(runId);
            close();
          }}
        />
      )}
    </Picker>
  );
}
