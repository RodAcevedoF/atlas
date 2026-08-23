import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useRef } from "react";
import MapGL, { type MapEvent, type MapRef } from "react-map-gl/maplibre";
import { BASEMAP_STYLE, INITIAL_VIEW_STATE, RESET_CAMERA } from "./constants.ts";
import { AwarenessOrbLayers } from "./overlays/awareness-orb-layers.tsx";
import { ZoomControl } from "./overlays/zoom-control.tsx";
import { applyBasemapTheme } from "./utils/basemap-theme.ts";
import type { ClaimFeatureCollection } from "./utils/claim-points.ts";

interface WorldMapProps {
  awareness: ClaimFeatureCollection | null;
}

export function WorldMap({ awareness }: WorldMapProps) {
  const mapRef = useRef<MapRef>(null);

  const handleLoad = useCallback((event: MapEvent) => {
    applyBasemapTheme(event.target);
  }, []);

  const resetView = useCallback(() => mapRef.current?.easeTo(RESET_CAMERA), []);
  const zoomIn = useCallback(() => mapRef.current?.zoomIn(), []);
  const zoomOut = useCallback(() => mapRef.current?.zoomOut(), []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-card">
      <div className="absolute inset-0">
        <MapGL
          ref={mapRef}
          initialViewState={INITIAL_VIEW_STATE}
          mapStyle={BASEMAP_STYLE}
          cursor="grab"
          onLoad={handleLoad}
          attributionControl={false}
        >
          {awareness ? <AwarenessOrbLayers data={awareness} /> : null}
        </MapGL>
      </div>

      <div className="atlas-map-vignette pointer-events-none absolute inset-0" aria-hidden="true" />

      <ZoomControl onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetView} />
    </div>
  );
}
