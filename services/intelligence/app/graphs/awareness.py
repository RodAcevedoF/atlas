"""confidence tiering for a per-country awareness distribution"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from app.ports.awareness import AwarenessDistribution, CountrySeriesStats

Confidence = Literal["measured", "thin", "artifact"]

# too small to carry a mean.
SATURATED_PEAK = 25.0

# coverage across at least this share of buckets is sustained enough to be a level
SUSTAINED_BREADTH = 0.08

# below => saturated country is one spike and nothing more.
MINIMUM_BREADTH = 0.03


@dataclass(slots=True, frozen=True)
class RatedCountry:
    """The measured shape plus the one thing this module adds."""

    stats: CountrySeriesStats
    confidence: Confidence


def _confidence(stats: CountrySeriesStats) -> Confidence:
    breadth = stats.covered_buckets / stats.total_buckets
    if stats.peak < SATURATED_PEAK:
        # never saturated => so the denominator was real and the level stands
        return "measured" if breadth >= MINIMUM_BREADTH else "thin"
    if breadth >= SUSTAINED_BREADTH:
        return "measured"
    return "thin" if breadth >= MINIMUM_BREADTH else "artifact"


def rate_country(stats: CountrySeriesStats) -> RatedCountry:
    return RatedCountry(stats=stats, confidence=_confidence(stats))


def rate_distribution(distribution: AwarenessDistribution) -> list[RatedCountry]:
    return [rate_country(stats) for stats in distribution.countries]


def loudest(rated: list[RatedCountry], limit: int) -> list[RatedCountry]:
    """The ranking the map paints. Artifacts are excluded because their means are inflated."""
    ranked = [country for country in rated if country.confidence != "artifact"]
    ranked.sort(key=lambda country: -country.stats.awareness)
    return ranked[:limit]
