import { InquiryAskBox } from "@/features/inquiry";
import type { AwarenessLayer } from "../../hooks/use-awareness-layer.ts";
import { usePlaceSelection } from "../../hooks/use-place-selection.ts";
import { AwarenessLegend, AwarenessRunNotice } from "./overlays/awareness-legend.tsx";
import { MapError } from "./overlays/map-error.tsx";
import { MapFieldState } from "./overlays/map-field-state.tsx";
import { PlaceClaimsPanel } from "./overlays/place-claims-panel.tsx";
import { WorldMap } from "./world-map.tsx";

interface MapCockpitProps {
  awareness: AwarenessLayer;
  isLoading: boolean;
  error: string | null;
}

export function MapCockpit({ awareness, isLoading, error }: MapCockpitProps) {
  const { selected, select, clear } = usePlaceSelection(awareness.detail);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div className="absolute inset-0">
        <WorldMap
          awareness={awareness.isPainting ? awareness.points : null}
          selectedPlace={selected?.place ?? null}
          onSelectPlace={select}
        />
      </div>

      <MapFieldState
        isPainting={awareness.isPainting}
        isResolving={awareness.isResolving}
        hasLatestRun={awareness.latest !== null}
        isLoading={isLoading}
        hasError={error !== null}
      />

      <div className="pointer-events-none absolute left-1/2 top-4 z-10 flex w-full max-w-[22rem] -translate-x-1/2 flex-col items-center gap-2 px-4 lg:max-w-[min(32rem,calc(100vw-36rem))]">
        <div className="pointer-events-auto w-full">
          <InquiryAskBox />
        </div>
        {error ? <MapError message={error} /> : null}
        {awareness.showsNotice && awareness.latest ? (
          <AwarenessRunNotice
            latest={awareness.latest}
            isPinned={awareness.isPinned}
            isFallback={awareness.isFallback}
            requestMiss={awareness.requestMiss}
            isPainting={awareness.isPainting}
            onDismiss={awareness.dismissNotice}
          />
        ) : null}
      </div>

      {selected ? (
        <PlaceClaimsPanel
          key={`${selected.place}:${selected.country ?? ""}`}
          place={selected}
          onClose={clear}
        />
      ) : null}

      {awareness.isPainting && awareness.detail ? (
        <AwarenessLegend run={awareness.detail} plotted={awareness.plotted} />
      ) : null}
    </div>
  );
}
