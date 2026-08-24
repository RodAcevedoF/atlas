import { Eyebrow } from "@/shared/ui";
import { Card } from "@atlas/ui";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { UseInquiryRunResult } from "../hooks/use-inquiry-run.ts";
import type { InquiryRunSummaryRecord } from "../repositories/inquiry-repository.ts";
import { RunDetail } from "./run-detail.tsx";
import { RunList } from "./run-list.tsx";

const LOADING = "Loading your inquiry runs…";
const LOADING_RUN = "Loading this run…";
const EMPTY = "No inquiry runs yet.";

interface InquiryHistoryProps {
  runs: InquiryRunSummaryRecord[];
  isLoading: boolean;
  error: string | null;
  selectedId: string | null;
  pinnedRunId: string | null;
  onSelect: (runId: string) => void;
  onDelete: (runId: string) => void;
  detail: UseInquiryRunResult;
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="px-6 py-6">
      <Card className="p-5 text-[12.5px] text-muted-foreground">{children}</Card>
    </div>
  );
}

function DetailPane({
  detail,
  onDelete,
}: {
  detail: UseInquiryRunResult;
  onDelete: (() => void) | null;
}) {
  if (detail.run) return <RunDetail run={detail.run} onDelete={onDelete} />;
  if (detail.error) return <p className="text-[12.5px] text-destructive">{detail.error}</p>;
  return <p className="text-[12.5px] text-muted-foreground">{LOADING_RUN}</p>;
}

export function InquiryHistory({
  runs,
  isLoading,
  error,
  selectedId,
  pinnedRunId,
  onSelect,
  onDelete,
  detail,
}: InquiryHistoryProps) {
  const deletableId = selectedId !== null && selectedId !== pinnedRunId ? selectedId : null;
  const deleteSelected = deletableId === null ? null : () => onDelete(deletableId);

  if (runs.length === 0 && error) {
    return (
      <Notice>
        <span className="text-destructive">{error}</span>
      </Notice>
    );
  }

  if (runs.length === 0 && isLoading) return <Notice>{LOADING}</Notice>;

  if (runs.length === 0) {
    return (
      <Notice>
        {EMPTY}{" "}
        <Link to="/world" className="text-primary underline-offset-2 hover:underline">
          Ask the map a question
        </Link>{" "}
        and it lands here.
      </Notice>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3.5 px-6 py-6">
      {error ? <Card className="px-4 py-2.5 text-[12.5px] text-destructive">{error}</Card> : null}

      <div className="flex min-h-0 flex-1 gap-3.5">
        <Card className="flex w-72 shrink-0 flex-col gap-2.5 overflow-y-auto p-3.5">
          <Eyebrow>Inquiry runs</Eyebrow>
          <RunList runs={runs} selectedId={selectedId} onSelect={onSelect} />
        </Card>

        <Card className="min-w-0 flex-1 overflow-y-auto p-5">
          <DetailPane detail={detail} onDelete={deleteSelected} />
        </Card>
      </div>
    </div>
  );
}
