import { Popup } from "react-map-gl/maplibre";
import type { RegionTopicBreakdownRecord } from "../../../repositories/world-repository.ts";
import { REGION_LABELS } from "../../../utils/index.ts";
import type { HoverState, MapFillMode } from "../types.ts";
import { hoverDetail } from "../utils/fill-expressions.ts";

interface RegionHoverPopupProps {
  hover: HoverState;
  record: RegionTopicBreakdownRecord | undefined;
  mode: MapFillMode;
}

export function RegionHoverPopup({ hover, record, mode }: RegionHoverPopupProps) {
  const detail = hoverDetail(record, mode);
  return (
    <Popup
      longitude={hover.longitude}
      latitude={hover.latitude}
      closeButton={false}
      closeOnClick={false}
      offset={12}
    >
      <div className="flex flex-col gap-0.5">
        <div className="text-[11.5px] font-medium">
          {REGION_LABELS[hover.region]} — {record?.signalCount ?? 0} signals
        </div>
        {detail ? <div className="text-[10px] text-muted-foreground">{detail}</div> : null}
      </div>
    </Popup>
  );
}
