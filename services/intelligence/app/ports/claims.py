from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


class ClaimSourceRetryable(Exception):
    """the source failed in a way an identical later request may survive."""


class ClaimSourceUnavailable(Exception):
    """the source answered with something unusable."""


@dataclass(slots=True, frozen=True)
class ClaimPlace:
    """where the claim says the thing happened, never where the article was published."""

    name: str
    country: str | None = None
    latitude: float | None = None
    longitude: float | None = None


@dataclass(slots=True, frozen=True)
class Claim:
    text: str
    place: ClaimPlace
    confidence: float
    source_url: str
    source_title: str | None = None
    published_date: str | None = None
    source_image_url: str | None = None


@dataclass(slots=True, frozen=True)
class SourceDocument:
    url: str
    title: str | None
    published_date: str | None
    text: str | None
    highlights: list[str]
    image_url: str | None = None


@dataclass(slots=True, frozen=True)
class RetrievalCost:
    usd: float
    reported: bool
    searches: int
    results: int


@dataclass(slots=True, frozen=True)
class ClaimsRetrieval:
    question: str
    claims: list[Claim]
    documents: list[SourceDocument]
    cost: RetrievalCost


class ClaimSourcePort(Protocol):
    async def fetch(self, question: str, limit: int, window: str) -> ClaimsRetrieval: ...
