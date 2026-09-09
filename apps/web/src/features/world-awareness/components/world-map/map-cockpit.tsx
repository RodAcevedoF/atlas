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
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto sm:max-xl:[@media(max-height:500px)]:flex-row sm:max-xl:[@media(max-height:500px)]:overflow-hidden xl:overflow-hidden">
      <div className="pointer-events-none relative z-20 flex max-h-[35dvh] w-full shrink-0 flex-col items-center gap-2 overflow-y-auto px-3 py-3 sm:max-xl:[@media(max-height:500px)]:max-h-full sm:max-xl:[@media(max-height:500px)]:w-72 xl:absolute xl:left-1/2 xl:top-4 xl:max-h-[calc(100%-5rem)] xl:max-w-[min(32rem,calc(100vw-40rem))] xl:-translate-x-1/2 xl:overflow-visible xl:px-4 xl:py-0">
        <div className="pointer-events-auto w-full max-w-xl">
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

      <div className="relative min-h-80 flex-1 sm:max-xl:[@media(max-height:500px)]:min-h-0 xl:min-h-0">
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
    </div>
  );
}
