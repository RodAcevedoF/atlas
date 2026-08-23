"""joins claims to their normalised places, then aggregates to the shape the map paints"""

from __future__ import annotations

from collections import Counter
from collections.abc import Iterable, Sequence
from dataclasses import dataclass

from app.ports.claims import Claim
from app.ports.places import NormalisedPlace


@dataclass(slots=True, frozen=True)
class PlacedClaim:
    """a claim whose place survived normalisation."""

    claim: Claim
    place: NormalisedPlace


@dataclass(slots=True, frozen=True)
class PlaceGroup:
    name: str
    country: str | None
    latitude: float
    longitude: float
    claims: list[PlacedClaim]


def distinct_places(claims: Iterable[Claim]) -> list[str]:
    seen: dict[str, None] = {}
    for claim in claims:
        seen.setdefault(claim.place.name, None)
    return list(seen)


def place_claims(
    claims: Iterable[Claim], normalised: Sequence[NormalisedPlace]
) -> list[PlacedClaim]:
    by_raw = {place.raw: place for place in normalised}
    placed = []
    for claim in claims:
        place = by_raw.get(claim.place.name)
        if place is not None:
            placed.append(PlacedClaim(claim=claim, place=place))
    return placed


def canonical_place(placed: Sequence[PlacedClaim]) -> NormalisedPlace:
    weight = Counter(item.place.name for item in placed)
    return min(
        (item.place for item in placed),
        key=lambda place: (-weight[place.name], len(place.name), place.name),
    )


def canonical_country(placed: Sequence[PlacedClaim], canonical: NormalisedPlace) -> str | None:
    if canonical.country:
        return canonical.country
    return next((item.place.country for item in placed if item.place.country), None)


def group_by_place(placed: Iterable[PlacedClaim]) -> list[PlaceGroup]:
    groups: dict[tuple[float, float], list[PlacedClaim]] = {}

    for item in placed:
        latitude, longitude = item.place.latitude, item.place.longitude
        if latitude is None or longitude is None:
            continue
        groups.setdefault((latitude, longitude), []).append(item)

    result = []
    for (latitude, longitude), claims in groups.items():
        canonical = canonical_place(claims)
        result.append(
            PlaceGroup(
                name=canonical.name,
                country=canonical_country(claims, canonical),
                latitude=latitude,
                longitude=longitude,
                claims=claims,
            )
        )
    result.sort(key=lambda group: (-len(group.claims), group.name))
    return result


def unplaced_count(placed: Sequence[PlacedClaim], total: int) -> int:
    plottable = sum(1 for item in placed if item.place.is_plottable())
    return total - plottable
