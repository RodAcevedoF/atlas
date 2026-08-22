"""
retrieves located claims on a question from Exa, and prices the call it made
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx

from app.ports.claims import (
    Claim,
    ClaimPlace,
    ClaimSourceRetryable,
    ClaimSourceUnavailable,
    ClaimsRetrieval,
    RetrievalCost,
    SourceDocument,
)

SEARCH_URL = "https://api.exa.ai/search"

WINDOW_UNIT_DAYS = {"d": 1, "w": 7}
MAX_WINDOW_DAYS = 366

BILLED_CONTENT_TYPES = 1

SUMMARY_INSTRUCTIONS = (
    "Extract the factual claims this article makes about events, and for each one the place "
    "where the event happened. The place is the location of the event itself, never the "
    "publisher's location and never the dateline unless the event happened there. Skip claims "
    "you cannot place. Rate confidence in the extraction from 0 to 1."
)

CLAIM_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "claims": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "claim": {"type": "string"},
                    "place": {"type": "string"},
                    "country": {"type": "string"},
                    "confidence": {"type": "number"},
                },
                "required": ["claim", "place", "confidence"],
            },
        }
    },
    "required": ["claims"],
}


@dataclass(slots=True, frozen=True)
class ExaPricing:
    """https://exa.ai/pricing, in the units Exa quotes. Resolved at the composition root."""

    search_per_1k: float
    extra_result_per_1k: float
    content_page_per_1k: float
    included_results: int

    def estimate(self, results: int) -> float:
        """What a run of this size should cost. Exa bills the real number back per response."""
        extra_results = max(0, results - self.included_results)
        return (
            self.search_per_1k
            + extra_results * self.extra_result_per_1k
            + results * self.content_page_per_1k * BILLED_CONTENT_TYPES
        ) / 1_000


def _is_transient_status(status: int) -> bool:
    """A gateway blip, an upstream request timeout, or a rate refusal."""
    return status >= 500 or status in (408, 429)


def _optional_str(value: Any) -> str | None:
    return value if isinstance(value, str) and value.strip() else None


def _highlights(result: dict[str, Any]) -> list[str]:
    raw = result.get("highlights")
    if not isinstance(raw, list):
        return []
    return [item for item in raw if isinstance(item, str) and item.strip()]


def _to_document(result: dict[str, Any]) -> SourceDocument:
    return SourceDocument(
        url=str(result.get("url") or ""),
        title=_optional_str(result.get("title")),
        published_date=_optional_str(result.get("publishedDate")),
        text=_optional_str(result.get("text")),
        highlights=_highlights(result),
    )


def _extracted_claims(result: dict[str, Any]) -> list[dict[str, Any]]:
    """The schema'd summary rides back as a JSON string; an unparseable one carries no claims."""
    summary = _optional_str(result.get("summary"))
    if summary is None:
        return []
    try:
        payload = json.loads(summary)
    except ValueError:
        return []
    claims = payload.get("claims") if isinstance(payload, dict) else None
    if not isinstance(claims, list):
        return []
    return [claim for claim in claims if isinstance(claim, dict)]


def _to_claim(extracted: dict[str, Any], document: SourceDocument) -> Claim | None:
    """A claim with no text or no place has nothing a map or a normaliser can use."""
    text = _optional_str(extracted.get("claim"))
    place = _optional_str(extracted.get("place"))
    if text is None or place is None:
        return None

    confidence = extracted.get("confidence")
    return Claim(
        text=text,
        place=ClaimPlace(name=place, country=_optional_str(extracted.get("country"))),
        confidence=float(confidence) if isinstance(confidence, int | float) else 0.0,
        source_url=document.url,
        source_title=document.title,
        published_date=document.published_date,
    )


def _reported_cost(payload: dict[str, Any]) -> float | None:
    """Exa bills the call back on the response; that number outranks any local price table."""
    reported = payload.get("costDollars")
    total = reported.get("total") if isinstance(reported, dict) else None
    return float(total) if isinstance(total, int | float) else None


def _cost(payload: dict[str, Any], results: int, pricing: ExaPricing) -> RetrievalCost:
    reported = _reported_cost(payload)
    return RetrievalCost(
        usd=reported if reported is not None else pricing.estimate(results),
        reported=reported is not None,
        searches=1,
        results=results,
    )


def parse_retrieval(payload: dict[str, Any], question: str, pricing: ExaPricing) -> ClaimsRetrieval:
    results = payload.get("results")
    if not isinstance(results, list):
        raise ClaimSourceUnavailable(f"unusable results: {type(results).__name__}")

    documents: list[SourceDocument] = []
    claims: list[Claim] = []
    for result in results:
        if not isinstance(result, dict):
            continue
        document = _to_document(result)
        documents.append(document)
        claims.extend(
            claim
            for claim in (_to_claim(extracted, document) for extracted in _extracted_claims(result))
            if claim is not None
        )

    return ClaimsRetrieval(
        question=question,
        claims=claims,
        documents=documents,
        cost=_cost(payload, len(documents), pricing),
    )


def window_start(window: str, now: datetime) -> str:
    """`1w` -> the instant Exa must not publish-date past. The window is a promise to the reader."""
    count, unit = window[:-1], window[-1:]
    days = WINDOW_UNIT_DAYS.get(unit)
    if days is None or not count.isascii() or not count.isdigit():
        raise ClaimSourceUnavailable(f"unusable window: {window}")
    reach = int(count) * days
    if not 1 <= reach <= MAX_WINDOW_DAYS:
        raise ClaimSourceUnavailable(f"a window must reach 1 to {MAX_WINDOW_DAYS} days: {window}")
    return (now - timedelta(days=reach)).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def build_request(
    question: str, limit: int, search_type: str, start_published_date: str
) -> dict[str, Any]:
    """The question goes verbatim — Exa is semantic, so there is nothing to expand."""
    return {
        "query": question,
        "type": search_type,
        "numResults": limit,
        "startPublishedDate": start_published_date,
        "contents": {
            "text": True,
            "highlights": True,
            "summary": {"query": SUMMARY_INSTRUCTIONS, "schema": CLAIM_SCHEMA},
        },
    }


async def fetch_claims(
    question: str,
    limit: int,
    search_type: str,
    start_published_date: str,
    pricing: ExaPricing,
    client: httpx.AsyncClient,
) -> ClaimsRetrieval:
    request = build_request(question, limit, search_type, start_published_date)
    try:
        response = await client.post(SEARCH_URL, json=request)
    except httpx.TransportError as error:
        raise ClaimSourceRetryable(f"transport failure: {error}") from error

    if _is_transient_status(response.status_code):
        raise ClaimSourceRetryable(f"HTTP {response.status_code}")
    if response.status_code != 200:
        raise ClaimSourceUnavailable(f"HTTP {response.status_code}: {response.text[:200]}")

    try:
        payload = response.json()
    except ValueError as error:
        raise ClaimSourceUnavailable(
            f"undecodable JSON response: {response.text.strip()[:200]}"
        ) from error

    return parse_retrieval(payload, question, pricing)


class ExaClaimSource:
    """ClaimSourcePort over Exa search + schema'd contents. Holds no retry policy."""

    def __init__(
        self,
        api_key: str,
        pricing: ExaPricing,
        search_type: str,
        timeout_seconds: float,
    ) -> None:
        self._api_key = api_key
        self._pricing = pricing
        self._search_type = search_type
        self._timeout_seconds = timeout_seconds

    async def fetch(self, question: str, limit: int, window: str) -> ClaimsRetrieval:
        start = window_start(window, datetime.now(UTC))
        headers = {"x-api-key": self._api_key, "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=self._timeout_seconds, headers=headers) as client:
            return await fetch_claims(
                question, limit, self._search_type, start, self._pricing, client
            )
