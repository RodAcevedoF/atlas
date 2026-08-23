import type { InquiryPlaceRecord, InquiryRunRecord } from "@/features/inquiry";

export interface PlaceIdentity {
  place: string;
  country: string | null;
}

export interface PlaceSelection extends PlaceIdentity {
  runId: string;
}

export function readPlaceIdentity(
  properties: Record<string, unknown> | null | undefined,
): PlaceIdentity | null {
  const place = properties?.place;
  if (typeof place !== "string") return null;

  const country = properties?.country;
  return { place, country: typeof country === "string" ? country : null };
}

export function findSelectedPlace(
  run: InquiryRunRecord | null,
  selection: PlaceSelection | null,
): InquiryPlaceRecord | null {
  if (!run || !selection || selection.runId !== run.id) return null;

  return (
    run.places.find(
      (place) => place.place === selection.place && place.country === selection.country,
    ) ?? null
  );
}
