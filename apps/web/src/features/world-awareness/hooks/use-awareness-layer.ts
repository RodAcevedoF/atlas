import {
  type InquiryRunRecord,
  type InquiryRunSummaryRecord,
  useInquiryRun,
} from "@/features/inquiry";
import { useCallback, useMemo, useState } from "react";
import {
  type AwarenessRequestMiss,
  type AwarenessSelection,
  selectAwarenessRun,
} from "../components/world-map/utils/awareness-run.ts";
import {
  type ClaimFeatureCollection,
  buildClaimPoints,
} from "../components/world-map/utils/claim-points.ts";

export interface AwarenessLayer {
  latest: InquiryRunSummaryRecord | null;
  run: InquiryRunSummaryRecord | null;
  detail: InquiryRunRecord | null;
  points: ClaimFeatureCollection | null;
  plotted: number;
  isPainting: boolean;
  isFallback: boolean;
  requestMiss: AwarenessRequestMiss | null;
  showsNotice: boolean;
  error: string | null;
  showAmbient: () => void;
  showRun: () => void;
  dismissNotice: () => void;
}

/** Every input the notice's sentence is built from — a dismissal holds only while all of them hold. */
interface NoticeInputs {
  selection: AwarenessSelection;
  isPainting: boolean;
  isFallback: boolean;
}

function noticeIdentity({ selection, isPainting, isFallback }: NoticeInputs): string | null {
  if (!selection.latest) return null;
  const miss = selection.requestMiss ?? "none";
  return `${selection.latest.id}:${selection.latest.status}:${miss}:${isPainting}:${isFallback}`;
}

export function useAwarenessLayer(
  runs: InquiryRunSummaryRecord[],
  requestedRunId: string | null,
): AwarenessLayer {
  const selection = useMemo(() => selectAwarenessRun(runs, requestedRunId), [runs, requestedRunId]);
  const detail = useInquiryRun(selection.run?.id ?? null);
  const points = useMemo(
    () => (detail.run ? buildClaimPoints(detail.run.places) : null),
    [detail.run],
  );

  const [ambientForRunId, setAmbientForRunId] = useState<string | null>(null);
  const selectedRunId = selection.run?.id ?? null;
  const showAmbient = useCallback(() => setAmbientForRunId(selectedRunId), [selectedRunId]);
  const showRun = useCallback(() => setAmbientForRunId(null), []);

  const plotted = points?.features.length ?? 0;
  const showsAmbient = selectedRunId !== null && ambientForRunId === selectedRunId;
  const isPainting = plotted > 0 && !showsAmbient;
  const isFallback = isPainting && selection.isFallback;
  const isResolvingRun = selection.run !== null && detail.run === null;

  const [dismissedNotice, setDismissedNotice] = useState<string | null>(null);
  const noticeKey = noticeIdentity({ selection, isPainting, isFallback });
  const dismissNotice = useCallback(() => setDismissedNotice(noticeKey), [noticeKey]);

  const showsNotice =
    selection.latest !== null &&
    !isResolvingRun &&
    noticeKey !== dismissedNotice &&
    (plotted === 0 || isFallback || selection.requestMiss !== null);

  return {
    latest: selection.latest,
    run: selection.run,
    detail: detail.run,
    points,
    plotted,
    isPainting,
    isFallback,
    requestMiss: selection.requestMiss,
    showsNotice,
    error: detail.error,
    showAmbient,
    showRun,
    dismissNotice,
  };
}
