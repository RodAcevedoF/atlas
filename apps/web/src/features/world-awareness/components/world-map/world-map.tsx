import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource } from "maplibre-gl";
import { useCallback, useMemo, useRef, useState } from "react";
import MapGL, { type MapEvent, type MapLayerMouseEvent, type MapRef } from "react-map-gl/maplibre";
import type { GeoRegion, WorldEventRecord } from "../../repositories/market-repository.ts";
import {
  BASEMAP_STYLE,
  INITIAL_VIEW_STATE,
  INTERACTIVE_LAYERS,
  PIN_CLUSTER_LAYER,
  PIN_POINT_LAYER,
  PIN_SOURCE,
  RESET_CAMERA,
} from "./constants.ts";
import { CountryFillLayers } from "./overlays/country-fill-layers.tsx";
import { EventPinLayers } from "./overlays/event-pin-layers.tsx";
import { LegendPanel } from "./overlays/legend-panel.tsx";
import { RegionHoverPopup } from "./overlays/region-hover-popup.tsx";
import { ZoomControl } from "./overlays/zoom-control.tsx";
import type { BreakdownIndex, HoverState, MapFillMode } from "./types.ts";
import { applyBasemapTheme } from "./utils/basemap-theme.ts";
import { topicsPresent } from "./utils/fill-expressions.ts";
import { buildPinFeatures } from "./utils/pins.ts";
import { regionForSubregion } from "./utils/region-for-country.ts";

interface WorldMapProps {
  byRegion: BreakdownIndex;
  peak: number;
  selected: GeoRegion | null;
  events: WorldEventRecord[];
  onSelect: (region: GeoRegion) => void;
  onSelectEvent: (event: WorldEventRecord) => void;
  onClearSelection: () => void;
}

export function WorldMap({
  byRegion,
  peak,
  selected,
  events,
  onSelect,
  onSelectEvent,
  onClearSelection,
}: WorldMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [mode, setMode] = useState<MapFillMode>("tendency");
  const [hover, setHover] = useState<HoverState | null>(null);
  const [pinHover, setPinHover] = useState(false);

  const legendTopics = useMemo(() => topicsPresent(byRegion), [byRegion]);
  const pinData = useMemo(() => buildPinFeatures(events), [events]);
  const eventsById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);

  const expandCluster = useCallback((clusterId: number, center: [number, number]) => {
    const source = mapRef.current?.getSource(PIN_SOURCE) as GeoJSONSource | undefined;
    if (!source) return;
    source
      .getClusterExpansionZoom(clusterId)
      .then((zoom) => mapRef.current?.easeTo({ center, zoom }))
      .catch((error) => console.error("Failed to expand pin cluster", error));
  }, []);

  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const layerId = feature?.layer?.id;
      if (layerId === PIN_CLUSTER_LAYER) {
        const clusterId = feature?.properties?.cluster_id as number | undefined;
        const point = feature?.geometry as GeoJSON.Point | undefined;
        if (clusterId !== undefined && point) {
          expandCluster(clusterId, point.coordinates as [number, number]);
        }
        return;
      }
      if (layerId === PIN_POINT_LAYER) {
        const id = feature?.properties?.id as string | undefined;
        const pinEvent = id ? eventsById.get(id) : undefined;
        if (pinEvent) onSelectEvent(pinEvent);
        return;
      }
      const region = regionForSubregion(feature?.properties?.subregion as string | undefined);
      if (region) {
        onSelect(region);
        return;
      }
      onClearSelection();
    },
    [onSelect, onSelectEvent, onClearSelection, expandCluster, eventsById],
  );

  const handleHover = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    const layerId = feature?.layer?.id;
    if (layerId === PIN_CLUSTER_LAYER || layerId === PIN_POINT_LAYER) {
      setPinHover(true);
      setHover(null);
      return;
    }
    setPinHover(false);
    const region = regionForSubregion(feature?.properties?.subregion as string | undefined);
    if (!region) {
      setHover(null);
      return;
    }
    setHover({ longitude: event.lngLat.lng, latitude: event.lngLat.lat, region });
  }, []);

  const clearHover = useCallback(() => {
    setHover(null);
    setPinHover(false);
  }, []);

  const handleLoad = useCallback((event: MapEvent) => {
    applyBasemapTheme(event.target);
  }, []);

  const resetView = useCallback(() => {
    mapRef.current?.easeTo(RESET_CAMERA);
    onClearSelection();
  }, [onClearSelection]);

  const zoomIn = useCallback(() => mapRef.current?.zoomIn(), []);
  const zoomOut = useCallback(() => mapRef.current?.zoomOut(), []);

  const hoverRecord = hover ? byRegion.get(hover.region) : undefined;

  return (
    <div className="relative h-full w-full overflow-hidden bg-card">
      <div className="absolute inset-0">
        <MapGL
          ref={mapRef}
          initialViewState={INITIAL_VIEW_STATE}
          mapStyle={BASEMAP_STYLE}
          interactiveLayerIds={INTERACTIVE_LAYERS}
          cursor={hover || pinHover ? "pointer" : "grab"}
          onLoad={handleLoad}
          onClick={handleClick}
          onMouseMove={handleHover}
          onMouseLeave={clearHover}
          attributionControl={false}
        >
          <CountryFillLayers byRegion={byRegion} peak={peak} mode={mode} selected={selected} />
          <EventPinLayers data={pinData} />
          {hover ? <RegionHoverPopup hover={hover} record={hoverRecord} mode={mode} /> : null}
        </MapGL>
      </div>

      <div className="atlas-map-vignette pointer-events-none absolute inset-0" aria-hidden="true" />

      <LegendPanel mode={mode} onModeChange={setMode} topics={legendTopics} />
      <ZoomControl onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetView} />
    </div>
  );
}
