import type { InquiryPlaceRecord } from "../repositories/inquiry-repository.ts";

export function keyedPlaces(places: InquiryPlaceRecord[]) {
  const occurrences = new Map<string, number>();
  return places.map((place) => {
    const identity = JSON.stringify([place.place, place.country, place.latitude, place.longitude]);
    const occurrence = occurrences.get(identity) ?? 0;
    occurrences.set(identity, occurrence + 1);
    return { key: `${identity}:${occurrence}`, place };
  });
}
