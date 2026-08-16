"""
measures what share of each country own monitored press output matches a query
"""

from __future__ import annotations

from typing import Any

import httpx

from app.ports.awareness import AwarenessDistribution, CountrySeriesStats

DOC_ENDPOINT = "https://api.gdeltproject.org/api/v2/doc/doc"
TIMELINE_MODE = "timelinesourcecountry"

# GDELT rejects with this text under BOTH a 429 and a 200.
THROTTLE_MARKER = "Please limit requests"

SERIES_SUFFIX = " Volume Intensity"


class GdeltRetryable(Exception):
    """Upstream failed in a way an identical later request may survive."""


class GdeltThrottled(GdeltRetryable):
    """upstream refused for rate reasons."""


class GdeltUnavailable(Exception):
    """upstream answered with something unusable."""


def is_throttled(status: int, body: str) -> bool:
    return status == 429 or body.lstrip().startswith(THROTTLE_MARKER)


def _is_transient_status(status: int) -> bool:
    """A gateway blip or an upstream request timeout."""
    return status >= 500 or status == 408


def _summarize(country: str, values: list[float]) -> CountrySeriesStats:
    return CountrySeriesStats(
        country=country,
        awareness=sum(values) / len(values),
        peak=max(values),
        covered_buckets=sum(1 for value in values if value > 0),
        total_buckets=len(values),
    )


def parse_distribution(payload: dict[str, Any], query: str, window: str) -> AwarenessDistribution:
    series_list = payload.get("timeline")
    if not isinstance(series_list, list):
        raise GdeltUnavailable("response carried no timeline")

    countries = []
    for series in series_list:
        name = series.get("series")
        if not isinstance(name, str):
            raise GdeltUnavailable("timeline carried a series with no name")
        values = [
            point.get("value") for point in series.get("data", []) if point.get("value") is not None
        ]
        if not values:
            continue
        countries.append(_summarize(name.removesuffix(SERIES_SUFFIX), values))

    countries.sort(key=lambda stats: -stats.awareness)
    return AwarenessDistribution(executed_query=query, window=window, countries=countries)


async def fetch_awareness(
    query: str, window: str, client: httpx.AsyncClient
) -> AwarenessDistribution:
    params = {"query": query, "mode": TIMELINE_MODE, "timespan": window, "format": "json"}
    try:
        response = await client.get(DOC_ENDPOINT, params=params)
    except httpx.TransportError as error:
        raise GdeltRetryable(f"transport failure: {error}") from error

    body = response.text
    if is_throttled(response.status_code, body):
        raise GdeltThrottled(body.strip()[:200])
    if _is_transient_status(response.status_code):
        raise GdeltRetryable(f"HTTP {response.status_code}")
    if response.status_code != 200:
        raise GdeltUnavailable(f"HTTP {response.status_code}")
    if not body.lstrip().startswith("{"):
        raise GdeltUnavailable(f"non-JSON response: {body.strip()[:200]}")

    try:
        payload = response.json()
    except ValueError as error:
        raise GdeltUnavailable(f"undecodable JSON response: {body.strip()[:200]}") from error

    return parse_distribution(payload, query, window)


class GdeltAwarenessSource:
    """AwarenessSourcePort over GDELT DOC 2.0. Holds no retry policy."""

    def __init__(self, timeout_seconds: float) -> None:
        self._timeout_seconds = timeout_seconds

    async def fetch(self, query: str, window: str) -> AwarenessDistribution:
        async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
            return await fetch_awareness(query, window, client)
