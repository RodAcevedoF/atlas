"""ports for the awareness lens: where a measurement comes from, and who narrates it"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol


class AwarenessRetryable(Exception):
    """the source failed in a way an identical later request may survive."""


class AwarenessUnavailable(Exception):
    """the source answered with something unusable."""


@dataclass(slots=True, frozen=True)
class CountrySeriesStats:
    """aggregated shape of one country series. slots keeps the raw timeline out."""

    country: str
    awareness: float
    peak: float
    covered_buckets: int
    total_buckets: int


@dataclass(slots=True, frozen=True)
class AwarenessDistribution:
    executed_query: str
    window: str
    countries: list[CountrySeriesStats]


class AwarenessSourcePort(Protocol):
    """a corpus that can answer "who covered this, and how much of their own output was it"."""

    async def fetch(self, query: str, window: str) -> AwarenessDistribution: ...


@dataclass(slots=True, frozen=True)
class RejectedQuery:
    """an expansion the validator refused"""

    query: str
    reason: str


class AwarenessAnalystPort(Protocol):
    """the two language steps: a question in, a source query out."""

    async def expand_query(self, question: str, rejected: Sequence[RejectedQuery]) -> str: ...

    async def synthesize(self, question: str, distribution_summary: str) -> str: ...
