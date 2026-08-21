from collections.abc import AsyncIterator
from typing import Any, TypedDict, cast

from langgraph.graph import END, START, StateGraph

from app.core.events import GraphEvent
from app.graphs.awareness import RatedCountry, loudest, rate_distribution
from app.graphs.query_validation import violation
from app.ports.awareness import (
    AwarenessAnalystPort,
    AwarenessRetryable,
    AwarenessSourcePort,
    AwarenessUnavailable,
    RejectedQuery,
)

DEFAULT_WINDOW = "1w"

EXPANSION_ATTEMPTS = 2

# bounds the synthesis prompt.
LOUDEST_IN_SUMMARY = 15
QUIETEST_IN_SUMMARY = 10


class AwarenessState(TypedDict):
    question: str
    window: str
    executed_query: str
    ranked: list[RatedCountry]
    synthesis: str
    status: str
    error: str


def to_record(country: RatedCountry) -> dict[str, Any]:
    """Flatten to the persisted `CountryAwareness` shape (camelCase — the TS side reads it)."""
    stats = country.stats
    return {
        "country": stats.country,
        "awareness": stats.awareness,
        "peak": stats.peak,
        "coveredBuckets": stats.covered_buckets,
        "totalBuckets": stats.total_buckets,
        "confidence": country.confidence,
    }


def _line(country: RatedCountry) -> str:
    stats = country.stats
    return (
        f"- {stats.country}: {stats.awareness:.3f}% of its own monitored output, "
        f"present in {stats.covered_buckets}/{stats.total_buckets} buckets [{country.confidence}]"
    )


def render_summary(ranked: list[RatedCountry]) -> str:
    """What the model reads. Artifacts are dropped"""
    ordered = loudest(ranked, limit=len(ranked))
    if len(ordered) <= LOUDEST_IN_SUMMARY + QUIETEST_IN_SUMMARY:
        return "\n".join(
            [f"All {len(ordered)} countries measured, most attention first:"]
            + [_line(country) for country in ordered]
        )

    return "\n".join(
        [f"Most attention, of {len(ordered)} countries measured:"]
        + [_line(country) for country in ordered[:LOUDEST_IN_SUMMARY]]
        + ["", "Least attention — these countries are near-silent on it:"]
        + [_line(country) for country in ordered[-QUIETEST_IN_SUMMARY:]]
    )


def _still_open(state: AwarenessState) -> bool:
    """a node sets a status only when it has already ended the run."""
    return state.get("status") is None


def _route_expansion(state: AwarenessState) -> str:
    return "measure" if _still_open(state) else "end"


def _route(state: AwarenessState) -> str:
    return "synthesize" if _still_open(state) else "end"


class AwarenessLensGraph:
    """GraphRunner for `awareness`."""

    def __init__(
        self,
        source: AwarenessSourcePort,
        analyst: AwarenessAnalystPort,
        window: str = DEFAULT_WINDOW,
    ) -> None:
        self._source = source
        self._analyst = analyst
        self._window = window
        self._graph = self._build()

    def _build(self) -> Any:
        async def expand_node(state: AwarenessState) -> dict[str, Any]:
            rejected: list[RejectedQuery] = []
            for _ in range(EXPANSION_ATTEMPTS):
                try:
                    query = await self._analyst.expand_query(state["question"], rejected)
                except Exception as error:
                    return {"status": "failed_retryable", "error": str(error)}

                reason = violation(query)
                if reason is None:
                    return {"executed_query": query}

                rejected.append(RejectedQuery(query=query, reason=reason))

            last = rejected[-1]
            return {
                "executed_query": last.query,
                "status": "failed_permanent",
                "error": f"unusable expanded query: {last.reason}",
            }

        async def measure_node(state: AwarenessState) -> dict[str, Any]:
            try:
                distribution = await self._source.fetch(state["executed_query"], state["window"])
            except AwarenessRetryable as error:
                return {"status": "failed_retryable", "error": str(error)}
            except AwarenessUnavailable as error:
                return {"status": "failed_permanent", "error": str(error)}

            ranked = rate_distribution(distribution)
            if not loudest(ranked, limit=len(ranked)):
                return {"ranked": ranked, "status": "no_coverage"}
            return {"ranked": ranked}

        async def synthesize_node(state: AwarenessState) -> dict[str, Any]:
            summary = render_summary(state["ranked"])
            try:
                read = await self._analyst.synthesize(state["question"], summary)
            except Exception as error:
                return {"status": "failed_retryable", "error": str(error)}

            return {"synthesis": read, "status": "succeeded"}

        builder = StateGraph(AwarenessState)
        builder.add_node("expand", expand_node)
        builder.add_node("measure", measure_node)
        builder.add_node("synthesize", synthesize_node)
        builder.add_edge(START, "expand")
        builder.add_conditional_edges(
            "expand", _route_expansion, {"measure": "measure", "end": END}
        )
        builder.add_conditional_edges("measure", _route, {"synthesize": "synthesize", "end": END})
        builder.add_edge("synthesize", END)
        return builder.compile()

    async def run(self, run_id: str, input: dict[str, Any]) -> dict[str, Any]:
        question = str(input.get("question") or "").strip()
        if not question:
            raise ValueError("an awareness run needs a question")

        final = await self._graph.ainvoke(
            {"question": question, "window": str(input.get("window") or self._window)}
        )
        return _result(cast(AwarenessState, final))

    async def stream(self, run_id: str, input: dict[str, Any]) -> AsyncIterator[GraphEvent]:
        yield GraphEvent(runId=run_id, node="awareness", type="node:start")
        result = await self.run(run_id, input)
        yield GraphEvent(runId=run_id, node="awareness", type="run:complete", data=result)

    async def resume(self, run_id: str, input: dict[str, Any]) -> dict[str, Any]:
        return await self.run(run_id, input)


def _result(state: AwarenessState) -> dict[str, Any]:
    """every rated country is carried, artifacts included."""
    return {
        "executedQuery": state.get("executed_query"),
        "window": state["window"],
        "status": state["status"],
        "error": state.get("error"),
        "distribution": [to_record(country) for country in state.get("ranked") or []],
        "synthesis": state.get("synthesis"),
    }
