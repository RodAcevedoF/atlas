import asyncio
from typing import Any

import pytest
from test_claims_lens import StubAnalyst, StubNormaliser, StubSource, build, claim, retrieval

from app.core.events import RunEnvelope
from app.graphs.claims_lens import ClaimsLensGraph
from app.ports.analyst import InquiryAnalysis, InquiryAnalystUnavailable, PlaceRead
from app.ports.claims import ClaimSourceRetryable, ClaimSourceUnavailable, ClaimsRetrieval
from app.ports.places import PlaceNormaliserUnavailable

QUESTION = "what is happening in Sudan"
INPUT = {"question": QUESTION, "window": "1w"}


def collect(graph: ClaimsLensGraph, input: dict[str, Any], attempt: int = 1) -> list[RunEnvelope]:
    async def drain() -> list[RunEnvelope]:
        return [envelope async for envelope in graph.stream("run-1", input, attempt)]

    return asyncio.run(drain())


class GatedAnalyst:
    """An analyst that finishes only when the test opens the gate."""

    def __init__(self) -> None:
        self.gate = asyncio.Event()

    async def synthesize(self, question: str, places_summary: str) -> InquiryAnalysis:
        await self.gate.wait()
        return InquiryAnalysis(synthesis="a late synthesis", place_reads=[])


class TestTerminalEquivalence:
    equivalence_cases: list[tuple[str, ClaimsRetrieval | Exception, str]] = [
        ("a successful run", retrieval([claim("a", "Khartoum")]), "run_complete"),
        ("a run with no claims", retrieval([]), "run_complete"),
        ("a run with no plottable place", retrieval([claim("a", "Nowhereville")]), "run_complete"),
        ("a retryable source outage", ClaimSourceRetryable("HTTP 429"), "run_failed"),
        ("an unusable source answer", ClaimSourceUnavailable("HTTP 400: nope"), "run_failed"),
    ]

    def test_stream_and_run_agree_on_the_final_result(self) -> None:
        for name, source, expected_type in self.equivalence_cases:
            graph = build(source)

            envelopes = collect(graph, INPUT)
            result = asyncio.run(graph.run("run-1", INPUT))

            assert envelopes[-1].type == expected_type, name
            assert envelopes[-1].data["result"] == result, name

    def test_a_failing_normaliser_and_analyst_agree_too(self) -> None:
        failing_stages = [
            (
                "normaliser down",
                build(
                    retrieval([claim("a", "Khartoum")]),
                    normaliser=StubNormaliser(failure=PlaceNormaliserUnavailable("down")),
                ),
            ),
            (
                "analyst down",
                build(
                    retrieval([claim("a", "Khartoum")]),
                    analyst=StubAnalyst(failure=InquiryAnalystUnavailable("down")),
                ),
            ),
        ]
        for name, graph in failing_stages:
            envelopes = collect(graph, INPUT)
            result = asyncio.run(graph.run("run-1", INPUT))

            assert envelopes[-1].type == "run_failed", name
            assert envelopes[-1].data["result"] == result, name


class TestEventShape:
    def test_events_arrive_in_stage_order_with_an_increasing_sequence(self) -> None:
        graph = build(retrieval([claim("a", "Khartoum")]))

        envelopes = collect(graph, INPUT, attempt=2)

        assert [envelope.type for envelope in envelopes] == [
            "retrieval_complete",
            "map_ready",
            "synthesis_ready",
            "run_complete",
        ]
        assert [envelope.sequence for envelope in envelopes] == [1, 2, 3, 4]
        assert all(envelope.schemaVersion == 1 for envelope in envelopes)
        assert all(envelope.attempt == 2 for envelope in envelopes)
        assert all(envelope.runId == "run-1" for envelope in envelopes)
        assert all(
            isinstance(envelope.durationMs, int) and envelope.durationMs >= 0
            for envelope in envelopes
        )

    def test_the_retrieval_checkpoint_carries_what_a_resume_needs(self) -> None:
        graph = build(retrieval([claim("families were displaced", "Khartoum")]))

        envelopes = collect(graph, INPUT)

        checkpoint = envelopes[0].data
        assert checkpoint["claimCount"] == 1
        assert checkpoint["documentCount"] == 1
        assert checkpoint["costUsd"] == 0.045
        assert checkpoint["costReported"] is True
        assert checkpoint["documents"][0]["url"] == "https://example.test/article"
        assert checkpoint["claims"][0]["text"] == "families were displaced"
        assert checkpoint["claims"][0]["place"]["name"] == "Khartoum"

    def test_the_map_checkpoint_carries_validated_places_without_reads(self) -> None:
        graph = build(retrieval([claim("a", "Khartoum"), claim("b", "Nowhereville")]))

        envelopes = collect(graph, INPUT)

        checkpoint = next(e.data for e in envelopes if e.type == "map_ready")
        assert checkpoint["places"][0]["place"] == "Khartoum"
        assert checkpoint["places"][0]["read"] is None
        assert checkpoint["unplacedClaims"] == 1
        assert checkpoint["claimCount"] == 2

    def test_each_validated_place_read_arrives_as_its_own_event(self) -> None:
        source_url = "https://example.test/khartoum-1"
        analyst = StubAnalyst(
            analysis=InquiryAnalysis(
                synthesis="Reported activity concentrates on Khartoum.",
                place_reads=[
                    PlaceRead(
                        place="Khartoum",
                        country="Sudan",
                        text="Reports describe displacement.",
                        source_urls=[source_url],
                    )
                ],
            )
        )
        graph = build(
            retrieval(
                [
                    claim("families were displaced", "Khartoum", source_url=source_url),
                    claim("aid routes were disrupted", "Khartoum, Sudan"),
                ]
            ),
            analyst=analyst,
        )

        envelopes = collect(graph, INPUT)

        reads = [envelope for envelope in envelopes if envelope.type == "place_read_ready"]
        assert len(reads) == 1
        assert reads[0].data == {
            "place": "Khartoum",
            "country": "Sudan",
            "latitude": 15.5,
            "longitude": 32.5,
            "read": {"text": "Reports describe displacement.", "sourceUrls": [source_url]},
        }


class TestFailureBoundary:
    def test_map_ready_is_not_held_hostage_by_a_slow_analyst(self) -> None:
        analyst = GatedAnalyst()
        graph = ClaimsLensGraph(
            source=StubSource(retrieval([claim("a", "Khartoum")])),
            normaliser=StubNormaliser(),
            analyst=analyst,
        )

        async def observe() -> list[str]:
            seen: list[str] = []
            async for envelope in graph.stream("run-1", INPUT, 1):
                seen.append(envelope.type)
                if envelope.type == "map_ready":
                    analyst.gate.set()
            return seen

        seen = asyncio.run(asyncio.wait_for(observe(), timeout=2))

        assert "map_ready" in seen
        assert seen[-1] == "run_complete"

    def test_a_named_stage_failure_streams_a_safe_class_and_keeps_the_raw_error_inside(
        self,
    ) -> None:
        graph = build(ClaimSourceRetryable("HTTP 429"))

        envelopes = collect(graph, INPUT)

        assert [envelope.type for envelope in envelopes] == ["run_failed"]
        assert envelopes[0].data["failureClass"] == "transport"
        assert envelopes[0].data["result"]["error"] == "HTTP 429"

    def test_a_refused_input_streams_a_terminal_failure_instead_of_dropping_the_wire(
        self,
    ) -> None:
        graph = build(retrieval([claim("a", "Khartoum")]))

        envelopes = collect(graph, {"question": QUESTION})

        assert len(envelopes) == 1
        assert envelopes[0].type == "run_failed"
        assert envelopes[0].sequence == 1
        assert envelopes[0].data == {"failureClass": "internal", "result": None}

    def test_a_failure_the_graph_never_named_still_tears_the_stream_down(self) -> None:
        graph = build(
            retrieval([claim("a", "Khartoum")]),
            analyst=StubAnalyst(failure=ValueError("boom")),
        )

        with pytest.raises(ValueError):
            collect(graph, INPUT)
