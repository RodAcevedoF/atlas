"""the one language step left in the lens: reading the placed claims back as prose"""

from __future__ import annotations

from typing import Protocol


class InquiryAnalystUnavailable(Exception):
    """the analyst answered with something unusable."""


class InquiryAnalystPort(Protocol):
    """a question and a summary of what was found where."""

    async def synthesize(self, question: str, places_summary: str) -> str: ...
