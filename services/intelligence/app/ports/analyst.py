"""the one language step left in the lens: reading the placed claims back as prose"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


class InquiryAnalystUnavailable(Exception):
    """the analyst answered with something unusable."""


@dataclass(slots=True, frozen=True)
class PlaceRead:
    place: str
    country: str | None
    text: str
    source_urls: list[str]


@dataclass(slots=True, frozen=True)
class InquiryAnalysis:
    synthesis: str
    place_reads: list[PlaceRead]


class InquiryAnalystPort(Protocol):
    """a question and a summary of what was found where."""

    async def synthesize(self, question: str, places_summary: str) -> InquiryAnalysis: ...
