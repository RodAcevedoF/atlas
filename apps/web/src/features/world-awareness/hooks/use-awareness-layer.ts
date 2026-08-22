import { useInquiryRun } from "@/features/inquiry/hooks/use-inquiry-run.ts";
import type {
  InquiryRunRecord,
  InquiryRunSummaryRecord,
} from "@/features/inquiry/repositories/inquiry-repository.ts";
import { useCallback, useMemo, useState } from "react";
import {
  type AwarenessPaint,
  buildAwarenessPaint,
} from "../components/world-map/utils/awareness-points.ts";
import {
  type AwarenessRequestMiss,
  selectAwarenessRun,
} from "../components/world-map/utils/awareness-run.ts";

export interface AwarenessLayer {
  latest: InquiryRunSummaryRecord | null;
  run: InquiryRunSummaryRecord | null;
  detail: InquiryRunRecord | null;
  paint: AwarenessPaint | null;
  plotted: number;
  isPainting: boolean;
  isFallback: boolean;
  requestMiss: AwarenessRequestMiss | null;
  showsNotice: boolean;
  error: string | null;
  showAmbient: () => void;
  showRun: () => void;
}

export function useAwarenessLayer(
  runs: InquiryRunSummaryRecord[],
  requestedRunId: string | null,
): AwarenessLayer {
  const selection = useMemo(() => selectAwarenessRun(runs, requestedRunId), [runs, requestedRunId]);
  const detail = useInquiryRun(selection.run?.id ?? null);
  const paint = useMemo(
    () => (detail.run ? buildAwarenessPaint(detail.run.distribution) : null),
    [detail.run],
  );

  const [ambientForRunId, setAmbientForRunId] = useState<string | null>(null);
  const selectedRunId = selection.run?.id ?? null;
  const showAmbient = useCallback(() => setAmbientForRunId(selectedRunId), [selectedRunId]);
  const showRun = useCallback(() => setAmbientForRunId(null), []);

  const plotted = paint?.points.features.length ?? 0;
  const showsAmbient = selectedRunId !== null && ambientForRunId === selectedRunId;
  const isPainting = plotted > 0 && !showsAmbient;
  const isFallback = isPainting && selection.isFallback;
  const isResolvingRun = selection.run !== null && detail.run === null;
  const showsNotice =
    selection.latest !== null &&
    !isResolvingRun &&
    (plotted === 0 || isFallback || selection.requestMiss !== null);

  return {
    latest: selection.latest,
    run: selection.run,
    detail: detail.run,
    paint,
    plotted,
    isPainting,
    isFallback,
    requestMiss: selection.requestMiss,
    showsNotice,
    error: detail.error,
    showAmbient,
    showRun,
  };
}
