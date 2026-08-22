"""joins claims to their normalised places, then aggregates to the shape the map paints"""

from __future__ import annotations

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


def group_by_place(placed: Iterable[PlacedClaim]) -> list[PlaceGroup]:
    groups: dict[tuple[str, str | None], list[PlacedClaim]] = {}
    coordinates: dict[tuple[str, str | None], tuple[float, float]] = {}

    for item in placed:
        place = item.place
        latitude, longitude = place.latitude, place.longitude
        if latitude is None or longitude is None:
            continue
        key = (place.name, place.country)
        groups.setdefault(key, []).append(item)
        coordinates.setdefault(key, (latitude, longitude))

    result = [
        PlaceGroup(
            name=name,
            country=country,
            latitude=coordinates[(name, country)][0],
            longitude=coordinates[(name, country)][1],
            claims=claims,
        )
        for (name, country), claims in groups.items()
    ]
    result.sort(key=lambda group: (-len(group.claims), group.name))
    return result


def unplaced_count(placed: Sequence[PlacedClaim], total: int) -> int:
    plottable = sum(1 for item in placed if item.place.is_plottable())
    return total - plottable
