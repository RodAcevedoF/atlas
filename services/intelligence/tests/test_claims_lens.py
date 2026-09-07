import asyncio
from typing import Any

import pytest
from claims_lens_builders import (
    StubAnalyst,
    StubNormaliser,
    build,
    claim,
    retrieval,
)

from app.core.errors import GraphInputError
from app.graphs.claims_lens import ClaimsLensGraph, render_summary, to_place_record
from app.graphs.places import group_by_place, place_claims
from app.ports.analyst import InquiryAnalysis, InquiryAnalystUnavailable, PlaceRead
from app.ports.claims import ClaimSourceRetryable, ClaimSourceUnavailable, ClaimsRetrieval
from app.ports.places import NormalisedPlace, PlaceNormaliserUnavailable


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

        assert [place["place"] for place in result["places"]] == ["El Fasher", "Khartoum"]
        assert [place["claimCount"] for place in result["places"]] == [2, 2]

    def test_the_cost_exa_billed_back_rides_out_on_the_result(self) -> None:
        graph = build(retrieval([claim("a", "Khartoum")]))

        result = run(graph)

        assert result["costUsd"] == 0.045
        assert result["costReported"] is True

    def test_the_extraction_inputs_ride_out_on_the_result_for_persistence(self) -> None:
        graph = build(retrieval([claim("a", "Khartoum")]))

        result = run(graph)

        assert result["documents"] == [
            {
                "url": "https://example.test/article",
                "title": "a headline",
                "publishedDate": "2026-08-20T00:00:00.000Z",
                "text": "the article body",
                "highlights": ["a passage"],
            }
        ]

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
        assert result["documents"][0]["text"] == "the article body"

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
                        kind="specific",
                        latitude=15.5,
                        longitude=32.5,
                    )
                ],
            )
        )

        summary = render_summary(places, 0)

        assert "could not be placed" not in summary


class TestPlaceReads:
    def test_an_eligible_place_carries_a_read_and_the_sources_that_support_it(self) -> None:
        first_url = "https://example.test/khartoum-1"
        analyst = StubAnalyst(
            analysis=InquiryAnalysis(
                synthesis="Reported activity concentrates on Khartoum.",
                place_reads=[
                    PlaceRead(
                        place="Khartoum",
                        country="Sudan",
                        text="Reports describe displacement and disrupted aid routes.",
                        source_urls=[first_url],
                    )
                ],
            )
        )
        graph = build(
            retrieval(
                [
                    claim("families were displaced", "Khartoum", source_url=first_url),
                    claim(
                        "aid routes were disrupted",
                        "Khartoum, Sudan",
                        source_url="https://example.test/khartoum-2",
                    ),
                ]
            ),
            analyst=analyst,
        )

        result = run(graph)

        assert result["places"][0]["read"] == {
            "text": "Reports describe displacement and disrupted aid routes.",
            "sourceUrls": [first_url],
        }
        assert analyst.summary_seen is not None
        assert first_url in analyst.summary_seen

    def test_an_outside_citation_is_dropped_without_losing_the_run(self) -> None:
        analyst = StubAnalyst(
            analysis=InquiryAnalysis(
                synthesis="Reported activity concentrates on Khartoum.",
                place_reads=[
                    PlaceRead(
                        place="Khartoum",
                        country="Sudan",
                        text="An unsupported read.",
                        source_urls=["https://example.test/not-a-khartoum-source"],
                    )
                ],
            )
        )
        graph = build(
            retrieval([claim("a", "Khartoum"), claim("b", "Khartoum, Sudan")]),
            analyst=analyst,
        )

        result = run(graph)

        assert result["status"] == "succeeded"
        assert result["synthesis"] == "Reported activity concentrates on Khartoum."
        assert result["places"][0]["read"] is None

    def test_only_five_multi_claim_places_are_offered_for_reads(self) -> None:
        analyst = StubAnalyst()
        place_names = ["Khartoum", "El Fasher", "Kassala", "Nyala", "Omdurman", "Port Sudan"]
        claims = [
            claim(f"{place_name} claim {index}", place_name)
            for place_name in place_names
            for index in range(2)
        ]
        graph = build(retrieval(claims), analyst=analyst)

        run(graph)

        assert analyst.summary_seen is not None
        assert analyst.summary_seen.count("[place-read candidate]") == 5

    def test_a_single_claim_place_is_not_eligible_for_a_paraphrase(self) -> None:
        analyst = StubAnalyst(
            analysis=InquiryAnalysis(
                synthesis="One report mentions Khartoum.",
                place_reads=[
                    PlaceRead(
                        place="Khartoum",
                        country="Sudan",
                        text="A redundant paraphrase.",
                        source_urls=["https://example.test/article"],
                    )
                ],
            )
        )
        graph = build(retrieval([claim("a", "Khartoum")]), analyst=analyst)

        result = run(graph)

        assert result["places"][0]["read"] is None


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
                        kind="specific",
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
