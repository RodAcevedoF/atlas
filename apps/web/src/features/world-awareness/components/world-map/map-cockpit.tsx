import { InquiryAskBox, type InquiryRunSummaryRecord } from "@/features/inquiry";
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAwarenessLayer } from "../../hooks/use-awareness-layer.ts";
import { AwarenessLegend, AwarenessRunNotice } from "./overlays/awareness-legend.tsx";
import { MapError } from "./overlays/map-error.tsx";
import { WorldMap } from "./world-map.tsx";

interface MapCockpitProps {
  inquiryRuns: InquiryRunSummaryRecord[];
  error: string | null;
}

export function MapCockpit({ inquiryRuns, error }: MapCockpitProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedRunId = searchParams.get("run");
  const awareness = useAwarenessLayer(inquiryRuns, requestedRunId);
  const mapError = error ?? awareness.error;

  const clearRequestedRun = useCallback(() => {
    if (!requestedRunId) return;
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        params.delete("run");
        return params;
      },
      { replace: true },
    );
  }, [requestedRunId, setSearchParams]);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div className="absolute inset-0">
        <WorldMap awareness={awareness.isPainting ? awareness.points : null} />
      </div>

      <div className="pointer-events-none absolute left-1/2 top-4 z-10 flex w-full max-w-[22rem] -translate-x-1/2 flex-col items-center gap-2 px-4 lg:max-w-[min(32rem,calc(100vw-36rem))]">
        <div className="pointer-events-auto w-full">
          <InquiryAskBox onAsk={clearRequestedRun} />
        </div>
        {mapError ? <MapError message={mapError} /> : null}
        {awareness.showsNotice && awareness.latest ? (
          <AwarenessRunNotice
            latest={awareness.latest}
            isFallback={awareness.isFallback}
            requestMiss={awareness.requestMiss}
            isPainting={awareness.isPainting}
            onDismiss={awareness.dismissNotice}
          />
        ) : null}
      </div>

      {awareness.isPainting && awareness.detail ? (
        <AwarenessLegend run={awareness.detail} plotted={awareness.plotted} />
      ) : null}
    </div>
  );
}
