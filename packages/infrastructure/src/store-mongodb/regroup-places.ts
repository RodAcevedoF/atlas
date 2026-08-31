import type { InquiryPlace } from "@atlas/domain";

function louderOrShorter(left: InquiryPlace, right: InquiryPlace): InquiryPlace {
  if (left.claimCount !== right.claimCount) {
    return left.claimCount > right.claimCount ? left : right;
  }
  if (left.place.length !== right.place.length) {
    return left.place.length < right.place.length ? left : right;
  }
  return left.place <= right.place ? left : right;
}

function byClaimCountThenName(left: InquiryPlace, right: InquiryPlace): number {
  if (left.claimCount !== right.claimCount) return right.claimCount - left.claimCount;
  if (left.place === right.place) return 0;
  return left.place < right.place ? -1 : 1;
}

function canonicalCountry(group: InquiryPlace[], canonical: InquiryPlace): string | null {
  if (canonical.country) return canonical.country;
  return group.find((place) => place.country)?.country ?? null;
}

function canonicalPlace(group: InquiryPlace[]): InquiryPlace {
  return group.reduce(louderOrShorter);
}

function mergeIntoOnePlace(group: InquiryPlace[]): InquiryPlace {
  const canonical = canonicalPlace(group);
  const claims = group.flatMap((place) => place.claims);
  return {
    place: canonical.place,
    country: canonicalCountry(group, canonical),
    latitude: canonical.latitude,
    longitude: canonical.longitude,
    claimCount: claims.length,
    read: canonical.read,
    claims,
  };
}

export function regroupPlacesOntoCoordinates(places: InquiryPlace[]): InquiryPlace[] {
  const byCoordinate = new Map<string, InquiryPlace[]>();
  for (const place of places) {
    const key = `${place.latitude},${place.longitude}`;
    const held = byCoordinate.get(key);
    if (held) held.push(place);
    else byCoordinate.set(key, [place]);
  }

  const regrouped = [...byCoordinate.values()].map(mergeIntoOnePlace);
  regrouped.sort(byClaimCountThenName);
  return regrouped;
}
