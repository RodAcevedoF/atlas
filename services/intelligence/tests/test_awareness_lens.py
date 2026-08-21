import asyncio
from collections.abc import Sequence

import pytest

from app.core.events import GraphEvent
from app.graphs.awareness import rate_distribution
from app.graphs.awareness_lens import AwarenessLensGraph, render_summary, to_record
from app.ports.awareness import (
    AwarenessDistribution,
    AwarenessRetryable,
    AwarenessUnavailable,
    CountrySeriesStats,
    RejectedQuery,
)

BUCKETS = 166


def stats(country: str, awareness: float, peak: float, covered: int) -> CountrySeriesStats:
    return CountrySeriesStats(
        country=country,
        awareness=awareness,
        peak=peak,
        covered_buckets=covered,
        total_buckets=BUCKETS,
    )


def distribution(
    *countries: CountrySeriesStats, query: str = "sudan", window: str = "1w"
) -> AwarenessDistribution:
    return AwarenessDistribution(executed_query=query, window=window, countries=list(countries))


class InMemoryAwarenessSource:
    def __init__(self, by_query_window: dict[tuple[str, str], AwarenessDistribution]) -> None:
        self._by_query_window = by_query_window

    async def fetch(self, query: str, window: str) -> AwarenessDistribution:
        if (query, window) not in self._by_query_window:
            raise LookupError(f"no distribution seeded for {query!r} over {window!r}")
        return self._by_query_window[(query, window)]


class FailingAwarenessSource:
    def __init__(self, error: Exception) -> None:
        self._error = error

    async def fetch(self, query: str, window: str) -> AwarenessDistribution:
        raise self._error


class SynthesisFailingAnalyst:
    """expands normally, then cannot narrate — the measurement is already paid for."""

    def __init__(self, query: str, error: Exception) -> None:
        self._query = query
        self._error = error

    async def expand_query(self, question: str, rejected: Sequence[RejectedQuery]) -> str:
        return self._query

    async def synthesize(self, question: str, distribution_summary: str) -> str:
        raise self._error


class ExpansionFailingAnalyst:
    """cannot even expand — nothing has been measured yet."""

    def __init__(self, error: Exception) -> None:
        self._error = error

    async def expand_query(self, question: str, rejected: Sequence[RejectedQuery]) -> str:
        raise self._error

    async def synthesize(self, question: str, distribution_summary: str) -> str:
        raise AssertionError("synthesis cannot run when the expansion never produced a query")


class ScriptedExpansions:
    """expands to each query in turn, then repeats the last — the shape a retried expansion sees."""

    def __init__(self, *queries: str, read: str = "EU press is loud; East Asia is silent.") -> None:
        self._queries = list(queries)
        self._read = read
        self._call = 0

    async def expand_query(self, question: str, rejected: Sequence[RejectedQuery]) -> str:
        query = self._queries[min(self._call, len(self._queries) - 1)]
        self._call += 1
        return query

    async def synthesize(self, question: str, distribution_summary: str) -> str:
        return self._read


class CorrectingAnalyst:
    """usable only once told what was wrong — a reroll on the same input stays malformed."""

    def __init__(self, malformed: str, corrected: str, read: str = "EU press is loud.") -> None:
        self._malformed = malformed
        self._corrected = corrected
        self._read = read

    async def expand_query(self, question: str, rejected: Sequence[RejectedQuery]) -> str:
        if any("AND-groups" in attempt.reason for attempt in rejected):
            return self._corrected
        return self._malformed

    async def synthesize(self, question: str, distribution_summary: str) -> str:
        return self._read


class ScriptedAnalyst:
    """real AwarenessAnalystPort returning fixed language."""

    def __init__(self, query: str, read: str = "EU press is loud; East Asia is silent.") -> None:
        self._query = query
        self._read = read

    async def expand_query(self, question: str, rejected: Sequence[RejectedQuery]) -> str:
        return self._query

    async def synthesize(self, question: str, distribution_summary: str) -> str:
        return self._read


def graph_over(
    *countries: CountrySeriesStats, query: str = '"Sudan"', window: str = "1w"
) -> AwarenessLensGraph:
    return AwarenessLensGraph(
        source=InMemoryAwarenessSource(
            {(query, window): distribution(*countries, query=query, window=window)}
        ),
        analyst=ScriptedAnalyst(query=query),
    )


class TestRenderSummary:
    def test_a_small_distribution_is_sent_whole(self) -> None:
        ranked = rate_distribution(
            distribution(
                stats("Sudan", 13.139, 100.0, 25),
                stats("Kenya", 4.0, 18.0, 60),
                stats("Japan", 0.016, 2.632, 40),
            )
        )

        summary = render_summary(ranked)

        assert "All 3 countries measured" in summary
        assert "Sudan" in summary
        assert "Japan" in summary

    def test_a_large_distribution_keeps_both_ends_and_drops_the_middle(self) -> None:
        ranked = rate_distribution(
            distribution(*[stats(f"C{index}", 40.0 - index, 18.0, 60) for index in range(40)])
        )

        summary = render_summary(ranked)

        assert "near-silent" in summary
        assert "- C0:" in summary
        assert "- C39:" in summary
        assert "- C20:" not in summary

    def test_artifacts_are_kept_out_of_what_the_model_reads(self) -> None:
        ranked = rate_distribution(
            distribution(stats("Sudan", 13.139, 100.0, 25), stats("Gambia", 0.602, 100.0, 1))
        )

        summary = render_summary(ranked)

        assert "Gambia" not in summary
        assert "Sudan" in summary

    def test_a_country_carries_its_confidence_so_a_thin_figure_is_readable(self) -> None:
        ranked = rate_distribution(distribution(stats("Sierra Leone", 1.392, 100.0, 6)))

        summary = render_summary(ranked)

        assert "[thin]" in summary


class TestToRecord:
    def test_the_persisted_shape_is_camel_cased_for_the_ts_side(self) -> None:
        rated = rate_distribution(distribution(stats("Sudan", 13.139, 100.0, 25)))[0]

        record = to_record(rated)

        assert record == {
            "country": "Sudan",
            "awareness": 13.139,
            "peak": 100.0,
            "coveredBuckets": 25,
            "totalBuckets": BUCKETS,
            "confidence": "measured",
        }


class TestAwarenessRun:
    def test_a_question_produces_a_distribution_and_a_read_of_it(self) -> None:
        graph = graph_over(stats("Sudan", 13.139, 100.0, 25), stats("Japan", 0.016, 2.632, 40))

        result = asyncio.run(graph.run("run-1", {"question": "Sudan famine coverage"}))

        assert result["status"] == "succeeded"
        assert result["executedQuery"] == '"Sudan"'
        assert result["window"] == "1w"
        assert result["synthesis"] == "EU press is loud; East Asia is silent."
        assert [country["country"] for country in result["distribution"]] == ["Sudan", "Japan"]

    def test_the_expanded_query_is_what_reaches_the_source(self) -> None:
        graph = AwarenessLensGraph(
            source=InMemoryAwarenessSource(
                {('"Sudan" OR "Darfur"', "1w"): distribution(stats("Sudan", 13.139, 100.0, 25))}
            ),
            analyst=ScriptedAnalyst(query='"Sudan" OR "Darfur"'),
        )

        result = asyncio.run(graph.run("run-1", {"question": "what about sudan"}))

        assert result["executedQuery"] == '"Sudan" OR "Darfur"'

    def test_nothing_matching_is_an_answer_not_a_failure(self) -> None:
        graph = graph_over()

        result = asyncio.run(graph.run("run-1", {"question": "an unreported thing"}))

        assert result["status"] == "no_coverage"
        assert result["distribution"] == []
        assert result["synthesis"] is None

    def test_a_distribution_of_only_artifacts_is_no_coverage(self) -> None:
        graph = graph_over(stats("Gambia", 0.602, 100.0, 1), stats("Fiji", 0.31, 100.0, 2))

        result = asyncio.run(graph.run("run-1", {"question": "an obscure thing"}))

        assert result["status"] == "no_coverage"
        assert result["synthesis"] is None
        assert [country["country"] for country in result["distribution"]] == ["Gambia", "Fiji"]

    def test_every_tier_survives_into_the_stored_distribution(self) -> None:
        graph = graph_over(
            stats("Sudan", 13.139, 100.0, 25),
            stats("Gambia", 0.602, 100.0, 1),
            stats("Sierra Leone", 1.392, 100.0, 6),
        )

        result = asyncio.run(graph.run("run-1", {"question": "Sudan"}))

        assert [country["confidence"] for country in result["distribution"]] == [
            "measured",
            "artifact",
            "thin",
        ]

    def test_the_window_is_overridable_per_run(self) -> None:
        graph = graph_over(stats("Sudan", 13.139, 100.0, 25), window="1m")

        result = asyncio.run(graph.run("run-1", {"question": "Sudan", "window": "1m"}))

        assert result["window"] == "1m"

    def test_a_run_without_a_question_fails_loudly(self) -> None:
        graph = graph_over(stats("Sudan", 13.139, 100.0, 25))

        for name, payload in [
            ("no question key", {}),
            ("an empty question", {"question": ""}),
            ("whitespace only", {"question": "   "}),
        ]:
            with pytest.raises(ValueError) as raised:
                asyncio.run(graph.run("run-1", payload))

            assert "question" in str(raised.value), name

    failure_cases = [
        (
            "a retryable source failure lets the worker go quiet and re-run",
            AwarenessRetryable("Please limit requests"),
            "failed_retryable",
        ),
        ("an unusable answer is permanent", AwarenessUnavailable("HTTP 400"), "failed_permanent"),
    ]

    def test_a_source_failure_crosses_the_boundary_as_a_status_not_an_exception(self) -> None:
        for name, error, expected in self.failure_cases:
            graph = AwarenessLensGraph(
                source=FailingAwarenessSource(error), analyst=ScriptedAnalyst(query='"Sudan"')
            )

            result = asyncio.run(graph.run("run-1", {"question": "sudan famine"}))

            assert result["status"] == expected, name
            assert result["error"] == str(error), name
            assert result["synthesis"] is None, name

    def test_a_narration_failure_keeps_the_measurement_and_stays_retryable(self) -> None:
        query = '"Sudan"'
        graph = AwarenessLensGraph(
            source=InMemoryAwarenessSource(
                {(query, "1w"): distribution(stats("Sudan", 13.139, 100.0, 25), query=query)}
            ),
            analyst=SynthesisFailingAnalyst(query=query, error=RuntimeError("provider 429")),
        )

        result = asyncio.run(graph.run("run-1", {"question": "sudan famine"}))

        assert result["status"] == "failed_retryable"
        assert result["error"] == "provider 429"
        assert result["synthesis"] is None
        assert [country["country"] for country in result["distribution"]] == ["Sudan"]

    def test_an_expansion_failure_is_as_retryable_as_the_same_blip_one_node_later(self) -> None:
        graph = AwarenessLensGraph(
            source=InMemoryAwarenessSource({}),
            analyst=ExpansionFailingAnalyst(RuntimeError("provider 429")),
        )

        result = asyncio.run(graph.run("run-1", {"question": "sudan famine"}))

        assert result["status"] == "failed_retryable"
        assert result["error"] == "provider 429"
        assert result["distribution"] == []
        assert result["synthesis"] is None

    def test_a_malformed_expansion_is_asked_again_before_it_costs_anything(self) -> None:
        good = "Sudan AND (famine OR مجاعة)"
        graph = AwarenessLensGraph(
            source=InMemoryAwarenessSource(
                {(good, "1w"): distribution(stats("Sudan", 13.139, 100.0, 25), query=good)}
            ),
            analyst=ScriptedExpansions("Sudan AND (famine OR مجاعة) AND (press OR prensa)", good),
        )

        result = asyncio.run(graph.run("run-1", {"question": "sudan famine"}))

        assert result["status"] == "succeeded"
        assert result["executedQuery"] == good

    def test_the_retry_is_told_why_the_first_query_was_refused(self) -> None:
        # without the reason the retry is a reroll on identical input, so it repeats the mistake.
        good = "Sudan AND (famine OR مجاعة)"
        graph = AwarenessLensGraph(
            source=InMemoryAwarenessSource(
                {(good, "1w"): distribution(stats("Sudan", 13.139, 100.0, 25), query=good)}
            ),
            analyst=CorrectingAnalyst(
                malformed="Sudan AND (famine OR مجاعة) AND (press OR prensa)", corrected=good
            ),
        )

        result = asyncio.run(graph.run("run-1", {"question": "sudan famine"}))

        assert result["status"] == "succeeded"
        assert result["executedQuery"] == good

    def test_a_query_still_malformed_on_the_retry_never_reaches_the_source(self) -> None:
        malformed = "Taiwan AND (strait OR 海峡) AND (tensions OR 紧张)"
        graph = AwarenessLensGraph(
            source=InMemoryAwarenessSource({}),
            analyst=ScriptedExpansions(malformed),
        )

        result = asyncio.run(graph.run("run-1", {"question": "taiwan strait tensions"}))

        assert result["status"] == "failed_permanent"
        assert "AND-groups" in result["error"]
        assert result["executedQuery"] == malformed
        assert result["distribution"] == []
        assert result["synthesis"] is None

    def test_the_stream_shape_carries_the_finished_result(self) -> None:
        graph = graph_over(stats("Sudan", 13.139, 100.0, 25))

        async def collect() -> list[GraphEvent]:
            return [event async for event in graph.stream("run-1", {"question": "Sudan"})]

        events = asyncio.run(collect())

        assert [event.type for event in events] == ["node:start", "run:complete"]
        assert events[-1].data is not None
        assert events[-1].data["status"] == "succeeded"
        assert events[-1].data["synthesis"] == "EU press is loud; East Asia is silent."
