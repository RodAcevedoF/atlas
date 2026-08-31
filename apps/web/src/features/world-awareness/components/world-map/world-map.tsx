import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useReducer, useRef } from "react";
import MapGL, { type MapEvent, type MapLayerMouseEvent, type MapRef } from "react-map-gl/maplibre";
import {
  BASEMAP_STYLE,
  INITIAL_VIEW_STATE,
  INTERACTIVE_LAYERS,
  RESET_CAMERA,
} from "./constants.ts";
import { AwarenessOrbLayers } from "./overlays/awareness-orb-layers.tsx";
import { MapPreviewCard } from "./overlays/map-preview-card.tsx";
import { ZoomControl } from "./overlays/zoom-control.tsx";
import { applyBasemapTheme } from "./utils/basemap-theme.ts";
import type { ClaimFeatureCollection } from "./utils/claim-points.ts";
import { expandCluster } from "./utils/cluster-zoom.ts";
import { mapPreviewReducer, visibleMapPreview } from "./utils/map-preview.ts";
import { type PlaceIdentity, readClusterId, readPlaceIdentity } from "./utils/place-selection.ts";

interface WorldMapProps {
  awareness: ClaimFeatureCollection | null;
  selectedPlace: string | null;
  onSelectPlace: (identity: PlaceIdentity | null) => void;
}

export function WorldMap({ awareness, selectedPlace, onSelectPlace }: WorldMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [preview, dispatchPreview] = useReducer(mapPreviewReducer, null);
  const visiblePreview = visibleMapPreview(preview, awareness);

  const handleLoad = useCallback((event: MapEvent) => {
    applyBasemapTheme(event.target);
  }, []);

  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const properties = event.features?.[0]?.properties;
      const clusterId = readClusterId(properties);
      const map = mapRef.current;

      if (clusterId !== null && map) {
        expandCluster(map, clusterId, event.lngLat);
        return;
      }

      onSelectPlace(readPlaceIdentity(properties));
    },
    [onSelectPlace],
  );

  const handlePointerMove = useCallback(
    (event: MapLayerMouseEvent) => {
      dispatchPreview({
        type: "hover",
        properties: event.features?.[0]?.properties,
        point: event.point,
        dataKey: awareness,
      });
    },
    [awareness],
  );
  const clearPointerPreview = useCallback(
    () => dispatchPreview({ type: "clear", reason: "leave" }),
    [],
  );
  const clearMovingPreview = useCallback(
    () => dispatchPreview({ type: "clear", reason: "move" }),
    [],
  );

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
          cursor={visiblePreview ? "pointer" : "grab"}
          onLoad={handleLoad}
          onClick={handleClick}
          onMouseMove={handlePointerMove}
          onMouseLeave={clearPointerPreview}
          onMoveStart={clearMovingPreview}
          interactiveLayerIds={INTERACTIVE_LAYERS}
          attributionControl={false}
        >
          {awareness ? <AwarenessOrbLayers data={awareness} selectedPlace={selectedPlace} /> : null}
        </MapGL>
      </div>

      <div className="atlas-map-vignette pointer-events-none absolute inset-0" aria-hidden="true" />

      {visiblePreview ? <MapPreviewCard anchored={visiblePreview} /> : null}

      <ZoomControl onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetView} />
    </div>
  );
}
