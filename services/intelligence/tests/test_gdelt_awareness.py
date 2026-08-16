import asyncio

import httpx
import pytest

from app.adapters.gdelt_awareness import (
    GdeltRetryable,
    GdeltThrottled,
    GdeltUnavailable,
    fetch_awareness,
    is_throttled,
    parse_distribution,
)
from app.ports.awareness import AwarenessRetryable, AwarenessUnavailable

THROTTLE_BODY = (
    "Please limit requests to one every 5 seconds or contact someone@example.com for larger "
    "queries. All high-traffic users should switch to our ngrams dataset."
)


def timeline(**series: list[float]) -> dict[str, object]:
    return {
        "timeline": [
            {
                "series": f"{country} Volume Intensity",
                "data": [
                    {"date": f"2026081{index}T000000Z", "value": value}
                    for index, value in enumerate(values)
                ],
            }
            for country, values in series.items()
        ]
    }


def responding(status: int, body: str) -> httpx.AsyncClient:
    transport = httpx.MockTransport(lambda _: httpx.Response(status, text=body))
    return httpx.AsyncClient(transport=transport)


class TestFailureVocabulary:
    # the graph catches the port's two failure kinds; an adapter error the port cannot name
    # escapes the graph and the run dies permanently.
    cases = [
        ("a throttle is retryable", GdeltThrottled("Please limit requests"), AwarenessRetryable),
        ("a gateway blip is retryable too", GdeltRetryable("HTTP 503"), AwarenessRetryable),
        ("an unusable answer is unavailable", GdeltUnavailable("HTTP 400"), AwarenessUnavailable),
    ]

    def test_every_gdelt_failure_is_carried_in_the_port_vocabulary(self) -> None:
        for name, error, expected in self.cases:
            assert isinstance(error, expected), name


class TestThrottleDetection:
    # GDELT ships the identical notice under both codes, so a status-only check reads the 200
    # form as success and a body-only check misses the 429 form.
    cases = [
        ("a 429 carrying the notice", 429, THROTTLE_BODY, True),
        ("a 200 carrying the notice", 200, THROTTLE_BODY, True),
        ("a 429 carrying nothing useful", 429, "", True),
        ("a 200 carrying real data", 200, '{"timeline": []}', False),
    ]

    def test_both_throttle_faces_are_detected(self) -> None:
        for name, status, body, expected in self.cases:
            assert is_throttled(status, body) is expected, name


class TestParseDistribution:
    def test_a_country_series_is_reduced_to_its_shape(self) -> None:
        payload = timeline(Sudan=[0.0, 100.0, 0.0, 50.0])

        distribution = parse_distribution(payload, "sudan", "1w")

        sudan = distribution.countries[0]
        assert sudan.country == "Sudan"
        assert sudan.awareness == pytest.approx(37.5)
        assert sudan.peak == 100.0
        assert sudan.covered_buckets == 2
        assert sudan.total_buckets == 4

    def test_countries_come_back_ranked_by_awareness(self) -> None:
        payload = timeline(Japan=[0.0, 1.0], Sudan=[10.0, 20.0], Kenya=[2.0, 2.0])

        distribution = parse_distribution(payload, "sudan", "1w")

        assert [country.country for country in distribution.countries] == [
            "Sudan",
            "Kenya",
            "Japan",
        ]

    def test_a_response_without_a_timeline_is_unusable(self) -> None:
        with pytest.raises(GdeltUnavailable):
            parse_distribution({"articles": []}, "sudan", "1w")

    def test_a_series_with_no_name_cannot_be_attributed_and_is_unusable(self) -> None:
        # skipping it would report the country as absent, which reads as a finding.
        payload = {"timeline": [{"data": [{"date": "20260810T000000Z", "value": 1.0}]}]}

        with pytest.raises(GdeltUnavailable):
            parse_distribution(payload, "sudan", "1w")

    def test_points_missing_a_value_are_skipped_rather_than_raising(self) -> None:
        payload = {
            "timeline": [
                {
                    "series": "Sudan Volume Intensity",
                    "data": [
                        {"date": "20260810T000000Z"},
                        {"date": "20260811T000000Z", "value": 4.0},
                    ],
                }
            ]
        }

        distribution = parse_distribution(payload, "sudan", "1w")

        assert distribution.countries[0].awareness == pytest.approx(4.0)
        assert distribution.countries[0].total_buckets == 1


class TestFetchAwareness:
    def test_a_throttled_response_raises_a_retryable_error(self) -> None:
        client = responding(429, THROTTLE_BODY)

        with pytest.raises(GdeltThrottled):
            asyncio.run(fetch_awareness("sudan", "1w", client))

    def test_a_throttle_disguised_as_success_still_raises(self) -> None:
        client = responding(200, THROTTLE_BODY)

        with pytest.raises(GdeltThrottled):
            asyncio.run(fetch_awareness("sudan", "1w", client))

    def test_a_non_json_body_is_permanently_unusable(self) -> None:
        client = responding(200, "<html>maintenance</html>")

        with pytest.raises(GdeltUnavailable):
            asyncio.run(fetch_awareness("sudan", "1w", client))

    retryable_cases = [
        ("a gateway blip, which must not mark the run permanently failed", 503),
        ("an upstream request timeout — the one 4xx that is a blip, not a bad query", 408),
    ]

    def test_transient_upstream_failures_are_retryable_not_permanent(self) -> None:
        for name, status in self.retryable_cases:
            client = responding(status, "upstream unavailable")

            with pytest.raises(GdeltRetryable) as raised:
                asyncio.run(fetch_awareness("sudan", "1w", client))

            assert not isinstance(raised.value, GdeltUnavailable), name

    def test_a_client_error_stays_permanent(self) -> None:
        client = responding(400, "bad query syntax")

        with pytest.raises(GdeltUnavailable):
            asyncio.run(fetch_awareness("sudan", "1w", client))

    def test_a_transport_failure_is_retryable(self) -> None:
        def failing(request: httpx.Request) -> httpx.Response:
            raise httpx.ConnectTimeout("timed out", request=request)

        client = httpx.AsyncClient(transport=httpx.MockTransport(failing))

        with pytest.raises(GdeltRetryable):
            asyncio.run(fetch_awareness("sudan", "1w", client))

    def test_a_truncated_json_body_is_unusable_not_a_decode_error(self) -> None:
        client = responding(200, '{"timeline": [{"series": "Sudan Volume Inten')

        with pytest.raises(GdeltUnavailable):
            asyncio.run(fetch_awareness("sudan", "1w", client))

    def test_a_real_payload_becomes_a_distribution(self) -> None:
        transport = httpx.MockTransport(
            lambda _: httpx.Response(200, json=timeline(Sudan=[10.0, 30.0]))
        )
        client = httpx.AsyncClient(transport=transport)

        distribution = asyncio.run(fetch_awareness("sudan", "1w", client))

        assert distribution.executed_query == "sudan"
        assert distribution.window == "1w"
        assert distribution.countries[0].awareness == pytest.approx(20.0)
