import type { GeoRegion, Market, PredictionEvent } from "@atlas/domain";
import { deriveRegionsFromText } from "@atlas/domain";

const DEFAULT_REGION: GeoRegion = "global";

export function enrichEventRegions(event: PredictionEvent): PredictionEvent {
  const regions = deriveRegionsFromText([
    event.title,
    event.description,
    event.slug,
    ...event.tags,
  ]);

  return {
    ...event,
    primaryRegion: regions[0] ?? DEFAULT_REGION,
    regions,
  };
}

export function enrichMarketRegions(
  market: Market,
  linkedEvent: PredictionEvent | undefined,
): Market {
  const regions = [
    ...new Set([
      ...(linkedEvent?.regions ?? []),
      ...deriveRegionsFromText([
        market.title,
        market.description,
        market.slug,
        linkedEvent?.title,
        linkedEvent?.description,
      ]),
    ]),
  ];

  return {
    ...market,
    primaryRegion: regions[0] ?? DEFAULT_REGION,
    regions,
  };
}
