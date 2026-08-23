import asyncio
import json
from datetime import UTC, datetime
from typing import Any

import httpx
import pytest
from langsmith import traceable
from langsmith.run_helpers import get_current_run_tree, tracing_context
from langsmith.run_trees import RunTree

from app.adapters.exa_claims import (
    ExaClaimSource,
    ExaPricing,
    build_request,
    cost_metadata,
    fetch_claims,
    parse_retrieval,
    record_cost_on_trace,
    trace_inputs,
    trace_outputs,
    window_start,
)
from app.ports.claims import (
    ClaimSourcePort,
    ClaimSourceRetryable,
    ClaimSourceUnavailable,
    RetrievalCost,
)

START = "2026-08-16T00:00:00.000Z"

PRICING = ExaPricing(
    search_per_1k=7.0,
    extra_result_per_1k=1.0,
    content_page_per_1k=1.0,
    included_results=10,
)


def result(
    url: str, claims: list[dict[str, Any]] | None = None, **overrides: Any
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "url": url,
        "title": "a headline",
        "publishedDate": "2026-08-20T00:00:00.000Z",
        "text": "the article body",
        "highlights": ["a highlighted passage"],
    }
    if claims is not None:
        body["summary"] = json.dumps({"claims": claims})
    body.update(overrides)
    return body


def responding(status: int, body: str) -> httpx.AsyncClient:
    transport = httpx.MockTransport(lambda _: httpx.Response(status, text=body))
    return httpx.AsyncClient(transport=transport)


class TestPricing:
    cases = [
        ("a search that returned nothing still bills the search", 0, 0.007),
        ("at the included-result boundary nothing extra is billed", 10, 0.017),
        ("one past the boundary bills one extra result", 11, 0.019),
        ("a full run bills the search, 15 extra results and 25 pages", 25, 0.047),
    ]

    def test_a_run_is_forecast_from_the_units_exa_quotes(self) -> None:
        for name, results, expected in self.cases:
            assert PRICING.estimate(results) == pytest.approx(expected), name

    def test_the_forecast_stays_close_to_a_measured_run(self) -> None:
        assert PRICING.estimate(25) == pytest.approx(0.045, rel=0.10)

    def test_the_bill_exa_returns_outranks_the_forecast(self) -> None:
        payload: dict[str, Any] = {
            "results": [result(f"https://example.com/{index}") for index in range(25)],
            "costDollars": {"total": 0.045, "search": {"neural": 0.022}, "summary": 0.023},
        }

        cost = parse_retrieval(payload, "q", PRICING).cost

        assert cost.usd == 0.045
        assert cost.reported is True
        assert cost.results == 25

    def test_a_response_that_bills_nothing_back_falls_to_the_forecast(self) -> None:
        payload = {"results": [result(f"https://example.com/{index}") for index in range(25)]}

        cost = parse_retrieval(payload, "q", PRICING).cost

        assert cost.usd == pytest.approx(0.047)
        assert cost.reported is False


class TestClaimExtraction:
    def test_a_located_claim_carries_its_place_and_its_source(self) -> None:
        payload = {
            "results": [
                result(
                    "https://example.com/sudan",
                    [
                        {
                            "claim": "famine spread in Darfur",
                            "place": "Darfur",
                            "country": "Sudan",
                            "confidence": 0.8,
                        }
                    ],
                )
            ]
        }

        retrieval = parse_retrieval(payload, "what is happening in Sudan", PRICING)

        assert len(retrieval.claims) == 1
        claim = retrieval.claims[0]
        assert claim.text == "famine spread in Darfur"
        assert claim.place.name == "Darfur"
        assert claim.place.country == "Sudan"
        assert claim.confidence == 0.8
        assert claim.source_url == "https://example.com/sudan"
        assert claim.published_date == "2026-08-20T00:00:00.000Z"

    def test_coordinates_are_left_for_the_normaliser(self) -> None:
        payload = {
            "results": [
                result(
                    "https://example.com/a", [{"claim": "c", "place": "Darfur", "confidence": 1}]
                )
            ]
        }

        retrieval = parse_retrieval(payload, "q", PRICING)

        assert retrieval.claims[0].place.latitude is None
        assert retrieval.claims[0].place.longitude is None

    unusable = [
        ("a claim with no place", {"claim": "something happened", "confidence": 0.5}),
        (
            "a claim with a blank place",
            {"claim": "something happened", "place": "  ", "confidence": 0.5},
        ),
        ("a place with no claim", {"place": "Darfur", "confidence": 0.5}),
    ]

    def test_a_claim_that_cannot_be_placed_is_dropped(self) -> None:
        for name, extracted in self.unusable:
            payload = {"results": [result("https://example.com/a", [extracted])]}

            retrieval = parse_retrieval(payload, "q", PRICING)

            assert retrieval.claims == [], name

    def test_a_claim_with_no_confidence_is_kept_at_zero(self) -> None:
        payload = {
            "results": [result("https://example.com/a", [{"claim": "c", "place": "Darfur"}])]
        }

        retrieval = parse_retrieval(payload, "q", PRICING)

        assert retrieval.claims[0].confidence == 0.0


    def test_the_extractor_inputs_survive_a_summary_that_yielded_nothing(self) -> None:
        payload = {"results": [result("https://example.com/a", None, summary="not json at all")]}

        retrieval = parse_retrieval(payload, "q", PRICING)

        assert retrieval.claims == []
        assert len(retrieval.documents) == 1
        assert retrieval.documents[0].text == "the article body"
        assert retrieval.documents[0].highlights == ["a highlighted passage"]

    def test_a_result_set_that_is_not_a_list_is_unusable(self) -> None:
        with pytest.raises(ClaimSourceUnavailable):
            parse_retrieval({"results": "nope"}, "q", PRICING)


class TestRequestShape:
    def test_the_question_reaches_exa_verbatim(self) -> None:
        request = build_request("¿qué está pasando en Sudán?", 25, "auto", START)

        assert request["query"] == "¿qué está pasando en Sudán?"
        assert request["numResults"] == 25
        assert request["type"] == "auto"

    def test_every_billed_content_type_is_actually_requested(self) -> None:
        contents = build_request("q", 25, "auto", START)["contents"]

        assert contents["text"] is True
        assert contents["highlights"] is True
        assert "schema" in contents["summary"]

    def test_the_window_bounds_the_search_rather_than_only_labelling_it(self) -> None:
        request = build_request("q", 25, "auto", START)

        assert request["startPublishedDate"] == START


class TestWindow:
    NOW = datetime(2026, 8, 23, 9, 30, tzinfo=UTC)

    def test_a_week_reaches_back_seven_days(self) -> None:
        assert window_start("1w", self.NOW) == "2026-08-16T09:30:00.000Z"

    def test_days_and_weeks_are_both_understood(self) -> None:
        assert window_start("3d", self.NOW) == "2026-08-20T09:30:00.000Z"
        assert window_start("2w", self.NOW) == "2026-08-09T09:30:00.000Z"

    UNUSABLE = {
        "no window at all": "",
        "a unit with no count": "w",
        "a unit the adapter has no days for": "1y",
        "a window that reaches nothing": "0w",
        "a negative reach": "-1w",
        "not a window at all": "lots",
        "a reach past the cap": "400d",
        "a reach that would overflow the clock": "9999999999w",
        "a digit int() cannot parse": "1²w",
    }

    @pytest.mark.parametrize("window", UNUSABLE.values(), ids=UNUSABLE.keys())
    def test_a_window_the_adapter_cannot_honour_is_refused_rather_than_ignored(
        self, window: str
    ) -> None:
        with pytest.raises(ClaimSourceUnavailable):
            window_start(window, self.NOW)

    def test_the_cap_is_the_edge_of_what_a_window_may_reach(self) -> None:
        assert window_start("366d", self.NOW) == "2025-08-22T09:30:00.000Z"

        with pytest.raises(ClaimSourceUnavailable):
            window_start("367d", self.NOW)


class TestFailureVocabulary:
    retryable = [
        ("a gateway blip", 502),
        ("an upstream timeout", 408),
        ("a rate refusal", 429),
    ]

    def test_a_failure_an_identical_retry_may_survive_is_retryable(self) -> None:
        for name, status in self.retryable:

            async def attempt(status: int = status) -> None:
                async with responding(status, "") as client:
                    await fetch_claims("q", 25, "auto", START, PRICING, client)

            with pytest.raises(ClaimSourceRetryable) as failure:
                asyncio.run(attempt())
            assert str(failure.value) == f"HTTP {status}", name

    def test_a_rejected_request_is_unavailable(self) -> None:
        async def attempt() -> None:
            async with responding(401, "bad key") as client:
                await fetch_claims("q", 25, "auto", START, PRICING, client)

        with pytest.raises(ClaimSourceUnavailable):
            asyncio.run(attempt())

    def test_an_undecodable_body_is_unavailable(self) -> None:
        async def attempt() -> None:
            async with responding(200, "<html>not json</html>") as client:
                await fetch_claims("q", 25, "auto", START, PRICING, client)

        with pytest.raises(ClaimSourceUnavailable):
            asyncio.run(attempt())

    def test_a_transport_failure_is_retryable(self) -> None:
        def refuse(request: httpx.Request) -> httpx.Response:
            raise httpx.ConnectError("refused", request=request)

        async def attempt() -> None:
            async with httpx.AsyncClient(transport=httpx.MockTransport(refuse)) as client:
                await fetch_claims("q", 25, "auto", START, PRICING, client)

        with pytest.raises(ClaimSourceRetryable):
            asyncio.run(attempt())


class TestPortConformance:
    def test_the_adapter_is_usable_wherever_the_port_is_declared(self) -> None:
        source: ClaimSourcePort = ExaClaimSource(
            api_key="resolved-at-the-composition-root",
            pricing=PRICING,
            search_type="auto",
            timeout_seconds=30.0,
        )

        assert isinstance(source, ExaClaimSource)


class TestTracedCost:
    """Exa bills in dollars over plain httpx."""

    claim = {"claim": "a claim", "place": "Khartoum", "confidence": 0.8}
    retrieval = parse_retrieval(
        {
            "results": [result("https://example.test/a", claims=[claim])],
            "costDollars": {"total": 0.047},
        },
        "where is lithium mining expanding",
        PRICING,
    )

    def test_the_trace_carries_counts_and_the_bill_but_never_the_article_bodies(self) -> None:
        logged = trace_outputs(self.retrieval)

        assert logged == {
            "claims": 1,
            "documents": 1,
            "costUsd": 0.047,
            "costReported": True,
        }
        assert "the article body" not in json.dumps(logged)

    def test_the_adapter_itself_is_not_shipped_as_an_input(self) -> None:
        logged = trace_inputs({"self": object(), "question": "q", "limit": 25, "window": "1w"})

        assert logged == {"question": "q", "limit": 25, "window": "1w"}

    def test_a_dollar_cost_reaches_the_span_because_langsmith_prices_only_tokens(self) -> None:
        cost = RetrievalCost(usd=0.047, reported=True, searches=1, results=25)

        with tracing_context(enabled="local"):

            @traceable
            def retrieve() -> RunTree | None:
                record_cost_on_trace(cost)
                return get_current_run_tree()

            run = retrieve()

        assert run is not None
        assert run.metadata["exa_cost_usd"] == 0.047
        assert run.metadata["exa_cost_reported"] is True
        assert run.metadata["exa_results"] == 25

    def test_an_estimate_is_marked_as_one_so_a_reader_can_tell_it_from_the_bill(self) -> None:
        estimated = cost_metadata(RetrievalCost(usd=0.047, reported=False, searches=1, results=25))

        assert estimated["exa_cost_reported"] is False

    def test_retrieval_survives_tracing_being_off_rather_than_depending_on_langsmith(self) -> None:
        cost = RetrievalCost(usd=0.047, reported=True, searches=1, results=25)

        with tracing_context(enabled=False):
            record_cost_on_trace(cost)
