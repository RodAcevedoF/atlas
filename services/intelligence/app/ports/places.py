"""canonicalising the place strings a claim extractor returns"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol


class PlaceNormaliserUnavailable(Exception):
    """the normaliser answered with something unusable."""


@dataclass(slots=True, frozen=True)
class NormalisedPlace:
    """raw is the string the extractor produced and the rest is what a map can use.
    """

    raw: str
    name: str
    country: str | None
    latitude: float | None
    longitude: float | None

    def is_plottable(self) -> bool:
        return self.latitude is not None and self.longitude is not None


class PlaceNormaliserPort(Protocol):
    """distinct place strings in, canonical places out — batched, because claims repeat places."""

    async def normalise(self, places: Sequence[str]) -> list[NormalisedPlace]: ...
