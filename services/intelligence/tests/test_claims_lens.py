import asyncio
from collections.abc import Sequence
from typing import Any

import pytest

from app.core.errors import GraphInputError
from app.graphs.claims_lens import ClaimsLensGraph, render_summary, to_place_record
from app.graphs.places import group_by_place, place_claims
from app.ports.analyst import InquiryAnalystUnavailable
from app.ports.claims import (
    Claim,
    ClaimPlace,
    ClaimSourceRetryable,
    ClaimSourceUnavailable,
    ClaimsRetrieval,
    RetrievalCost,
    SourceDocument,
)
from app.ports.places import NormalisedPlace, PlaceNormaliserUnavailable

PLACE_COORDINATES: dict[str, tuple[str, str | None, float | None, float | None]] = {
    "Khartoum": ("Khartoum", "Sudan", 15.5, 32.5),
    "Khartoum, Sudan": ("Khartoum", "Sudan", 15.5, 32.5),
    "El Fasher": ("El Fasher", "Sudan", 13.6, 25.3),
    "el-Fasher": ("El Fasher", "Sudan", 13.6, 25.3),
    "Regional institutions (IGAD)": ("Regional institutions", None, None, None),
}


def claim(text: str, place: str, confidence: float = 0.8) -> Claim:
    return Claim(
        text=text,
        place=ClaimPlace(name=place),
        confidence=confidence,
        source_url="https://example.test/article",
        source_title="a headline",
        published_date="2026-08-20T00:00:00.000Z",
        source_image_url="https://images.example.test/article.jpg",
    )


def retrieval(claims: list[Claim]) -> ClaimsRetrieval:
    return ClaimsRetrieval(
        question="what is happening in Sudan",
        claims=claims,
        documents=[
            SourceDocument(
                url="https://example.test/article",
                title="a headline",
                published_date="2026-08-20T00:00:00.000Z",
                text="the article body",
                highlights=["a passage"],
            )
        ],
        cost=RetrievalCost(usd=0.045, reported=True, searches=1, results=25),
    )


class StubSource:
    """A ClaimSourcePort that hands back a seeded retrieval, or raises what it was given."""

    def __init__(self, result: ClaimsRetrieval | Exception) -> None:
        self._result = result

    async def fetch(self, question: str, limit: int, window: str) -> ClaimsRetrieval:
        if isinstance(self._result, Exception):
            raise self._result
        return self._result


class StubNormaliser:
    """A PlaceNormaliserPort backed by a real lookup table — it genuinely canonicalises."""

    def __init__(self, failure: Exception | None = None) -> None:
        self._failure = failure

    async def normalise(self, places: Sequence[str]) -> list[NormalisedPlace]:
        if self._failure is not None:
            raise self._failure
        resolved = []
        for raw in places:
            if raw not in PLACE_COORDINATES:
                continue
            name, country, latitude, longitude = PLACE_COORDINATES[raw]
            resolved.append(
                NormalisedPlace(
                    raw=raw,
                    name=name,
                    country=country,
                    latitude=latitude,
                    longitude=longitude,
                )
            )
        return resolved


class StubAnalyst:
    def __init__(self, failure: Exception | None = None) -> None:
        self._failure = failure
        self.summary_seen: str | None = None

    async def synthesize(self, question: str, places_summary: str) -> str:
        if self._failure is not None:
            raise self._failure
        self.summary_seen = places_summary
        return "Most reported activity is around Khartoum."


def build(
    source: ClaimsRetrieval | Exception,
    normaliser: StubNormaliser | None = None,
    analyst: StubAnalyst | None = None,
) -> ClaimsLensGraph:
    return ClaimsLensGraph(
        source=StubSource(source),
        normaliser=normaliser or StubNormaliser(),
        analyst=analyst or StubAnalyst(),
    )


def run(graph: ClaimsLensGraph, question: str = "what is happening in Sudan") -> dict[str, Any]:
    return asyncio.run(graph.run("run-1", {"question": question, "window": "1w"}))


class TestSuccessfulRun:
    def test_a_question_returns_places_carrying_their_claims(self) -> None:
        graph = build(retrieval([claim("clashes displaced 7,800 people", "Khartoum")]))

        result = run(graph)

        assert result["status"] == "succeeded"
        assert result["places"][0]["place"] == "Khartoum"
        assert result["places"][0]["claimCount"] == 1

    def test_spellings_of_one_city_arrive_as_a_single_place(self) -> None:
        graph = build(
            retrieval(
                [
                    claim("a", "Khartoum"),
                    claim("b", "Khartoum, Sudan"),
                    claim("c", "El Fasher"),
                    claim("d", "el-Fasher"),
                ]
            )
        )

        result = run(graph)

        # equal counts tie-break by name, so the order is deterministic rather than dict order
        assert [place["place"] for place in result["places"]] == ["El Fasher", "Khartoum"]
        assert [place["claimCount"] for place in result["places"]] == [2, 2]

    def test_the_cost_exa_billed_back_rides_out_on_the_result(self) -> None:
        graph = build(retrieval([claim("a", "Khartoum")]))

        result = run(graph)

        assert result["costUsd"] == 0.045
        assert result["costReported"] is True

    def test_an_unplaceable_claim_is_counted_rather_than_silently_dropped(self) -> None:
        graph = build(
            retrieval([claim("a", "Khartoum"), claim("b", "Regional institutions (IGAD)")])
        )

        result = run(graph)

        assert result["claimCount"] == 2
        assert result["unplacedClaims"] == 1
        assert len(result["places"]) == 1

    def test_the_window_reaches_the_source_so_the_label_is_not_a_promise_alone(self) -> None:
        class RecordingSource:
            """Answers with the window it was asked for, so a dropped window shows up."""

            async def fetch(self, question: str, limit: int, window: str) -> ClaimsRetrieval:
                return retrieval([claim(f"asked for {window}", "Khartoum")])

        graph = ClaimsLensGraph(
            source=RecordingSource(), normaliser=StubNormaliser(), analyst=StubAnalyst()
        )
        result = asyncio.run(graph.run("run-1", {"question": "q", "window": "2w"}))

        assert result["places"][0]["claims"][0]["text"] == "asked for 2w"

    def test_a_run_without_a_window_is_refused_rather_than_silently_unbounded(self) -> None:
        graph = build(retrieval([claim("something", "Khartoum")]))

        with pytest.raises(GraphInputError):
            asyncio.run(graph.run("run-1", {"question": "q"}))

    def test_the_question_reaches_the_source_verbatim(self) -> None:
        # P2.2 deleted query expansion — Exa is semantic, so nothing rewrites the question.
        class EchoingSource:
            """Answers with the question it was asked, so a rewrite shows up in the result."""

            async def fetch(self, question: str, limit: int, window: str) -> ClaimsRetrieval:
                return retrieval([claim(question, "Khartoum")])

        graph = ClaimsLensGraph(
            source=EchoingSource(), normaliser=StubNormaliser(), analyst=StubAnalyst()
        )
        result = asyncio.run(graph.run("run-1", {"question": "何が起きているのか", "window": "1w"}))

        assert result["places"][0]["claims"][0]["text"] == "何が起きているのか"


class TestEndedRuns:
    def test_a_retrieval_with_no_claims_ends_as_no_coverage(self) -> None:
        graph = build(retrieval([]))

        result = run(graph)

        assert result["status"] == "no_coverage"
        assert result["places"] == []

    def test_claims_that_all_fail_to_place_end_as_below_floor(self) -> None:
        graph = build(retrieval([claim("a", "Regional institutions (IGAD)")]))

        result = run(graph)

        assert result["status"] == "below_floor"
        assert result["unplacedClaims"] == 1

    def test_a_retryable_source_failure_is_retryable(self) -> None:
        graph = build(ClaimSourceRetryable("HTTP 429"))

        result = run(graph)

        assert result["status"] == "failed_retryable"
        assert result["error"] == "HTTP 429"

    def test_an_unusable_source_answer_is_permanent(self) -> None:
        graph = build(ClaimSourceUnavailable("HTTP 400"))

        result = run(graph)

        assert result["status"] == "failed_permanent"

    def test_a_normaliser_failure_is_retryable_because_the_claims_are_still_good(self) -> None:
        graph = build(
            retrieval([claim("a", "Khartoum")]),
            normaliser=StubNormaliser(failure=PlaceNormaliserUnavailable("provider down")),
        )

        result = run(graph)

        assert result["status"] == "failed_retryable"

    def test_a_synthesis_failure_is_retryable(self) -> None:
        graph = build(
            retrieval([claim("a", "Khartoum")]),
            analyst=StubAnalyst(failure=InquiryAnalystUnavailable("provider down")),
        )

        result = run(graph)

        assert result["status"] == "failed_retryable"

    def test_a_failure_the_analyst_never_named_is_not_reported_as_retryable(self) -> None:
        # a deterministic bug retried to the cap is a retry budget spent on nothing.
        graph = build(
            retrieval([claim("a", "Khartoum")]), analyst=StubAnalyst(failure=TypeError("a bug"))
        )

        with pytest.raises(TypeError):
            run(graph)


class TestSummary:
    def test_the_analyst_reads_places_with_their_counts(self) -> None:
        analyst = StubAnalyst()
        graph = build(
            retrieval([claim("a", "Khartoum"), claim("b", "Khartoum, Sudan")]), analyst=analyst
        )

        run(graph)

        assert analyst.summary_seen is not None
        assert "Khartoum (Sudan): 2 claims" in analyst.summary_seen

    def test_unplaced_claims_are_named_to_the_analyst_rather_than_hidden(self) -> None:
        analyst = StubAnalyst()
        graph = build(
            retrieval([claim("a", "Khartoum"), claim("b", "Regional institutions (IGAD)")]),
            analyst=analyst,
        )

        run(graph)

        assert analyst.summary_seen is not None
        assert "1 further claims could not be placed" in analyst.summary_seen

    def test_a_summary_with_nothing_unplaced_says_nothing_about_it(self) -> None:
        places = group_by_place(
            place_claims(
                [claim("a", "Khartoum")],
                [
                    NormalisedPlace(
                        raw="Khartoum",
                        name="Khartoum",
                        country="Sudan",
                        latitude=15.5,
                        longitude=32.5,
                    )
                ],
            )
        )

        summary = render_summary(places, 0)

        assert "could not be placed" not in summary


class TestPlaceRecord:
    def test_a_claim_carries_its_source_so_the_map_can_link_out(self) -> None:
        places = group_by_place(
            place_claims(
                [claim("clashes displaced 7,800 people", "Khartoum")],
                [
                    NormalisedPlace(
                        raw="Khartoum",
                        name="Khartoum",
                        country="Sudan",
                        latitude=15.5,
                        longitude=32.5,
                    )
                ],
            )
        )

        record = to_place_record(places[0])

        assert record["claims"][0]["sourceUrl"] == "https://example.test/article"
        assert record["claims"][0]["publishedDate"] == "2026-08-20T00:00:00.000Z"
        assert record["claims"][0]["sourceImageUrl"] == "https://images.example.test/article.jpg"
        assert record["latitude"] == 15.5
