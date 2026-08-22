from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any, TypedDict, cast

from langgraph.graph import END, START, StateGraph

from app.core.errors import GraphInputError
from app.core.events import GraphEvent
from app.graphs.places import (
    PlaceGroup,
    distinct_places,
    group_by_place,
    place_claims,
    unplaced_count,
)
from app.ports.analyst import InquiryAnalystPort, InquiryAnalystUnavailable
from app.ports.claims import (
    ClaimSourcePort,
    ClaimSourceRetryable,
    ClaimSourceUnavailable,
    ClaimsRetrieval,
)
from app.ports.places import PlaceNormaliserPort, PlaceNormaliserUnavailable

DEFAULT_RESULT_LIMIT = 25

# bounds the synthesis prompt.
PLACES_IN_SUMMARY = 20
CLAIMS_PER_PLACE_IN_SUMMARY = 3


class ClaimsState(TypedDict):
    question: str
    limit: int
    window: str
    retrieval: ClaimsRetrieval
    places: list[PlaceGroup]
    unplaced: int
    synthesis: str
    status: str
    error: str


def _still_open(state: ClaimsState) -> bool:
    """a node sets a status only when it has already ended the run."""
    return state.get("status") is None


def _route(state: ClaimsState) -> str:
    return "open" if _still_open(state) else "end"


def _claim_line(group: PlaceGroup) -> str:
    ordered = sorted(group.claims, key=lambda item: -item.claim.confidence)
    return "\n".join(
        f"    - [{item.claim.confidence:.2f}] {item.claim.text}"
        for item in ordered[:CLAIMS_PER_PLACE_IN_SUMMARY]
    )


def render_summary(places: list[PlaceGroup], unplaced: int) -> str:
    lines = [f"{len(places)} places carry claims, most claims first:"]
    for group in places[:PLACES_IN_SUMMARY]:
        where = f"{group.name} ({group.country})" if group.country else group.name
        lines.append(f"- {where}: {len(group.claims)} claims")
        lines.append(_claim_line(group))
    if unplaced:
        lines.append(f"\n{unplaced} further claims could not be placed and are not on the map.")
    return "\n".join(lines)


def to_place_record(group: PlaceGroup) -> dict[str, Any]:
    return {
        "place": group.name,
        "country": group.country,
        "latitude": group.latitude,
        "longitude": group.longitude,
        "claimCount": len(group.claims),
        "claims": [
            {
                "text": item.claim.text,
                "confidence": item.claim.confidence,
                "sourceUrl": item.claim.source_url,
                "sourceTitle": item.claim.source_title,
                "publishedDate": item.claim.published_date,
            }
            for item in group.claims
        ],
    }


class ClaimsLensGraph:

    def __init__(
        self,
        source: ClaimSourcePort,
        normaliser: PlaceNormaliserPort,
        analyst: InquiryAnalystPort,
        limit: int = DEFAULT_RESULT_LIMIT,
    ) -> None:
        self._source = source
        self._normaliser = normaliser
        self._analyst = analyst
        self._limit = limit
        self._graph = self._build()

    def _build(self) -> Any:
        async def retrieve_node(state: ClaimsState) -> dict[str, Any]:
            try:
                retrieval = await self._source.fetch(
                    state["question"], state["limit"], state["window"]
                )
            except ClaimSourceRetryable as error:
                return {"status": "failed_retryable", "error": str(error)}
            except ClaimSourceUnavailable as error:
                return {"status": "failed_permanent", "error": str(error)}

            if not retrieval.claims:
                return {"retrieval": retrieval, "status": "no_coverage"}
            return {"retrieval": retrieval}

        async def normalise_node(state: ClaimsState) -> dict[str, Any]:
            claims = state["retrieval"].claims
            try:
                normalised = await self._normaliser.normalise(distinct_places(claims))
            except PlaceNormaliserUnavailable as error:
                return {"status": "failed_retryable", "error": str(error)}

            placed = place_claims(claims, normalised)
            places = group_by_place(placed)
            unplaced = unplaced_count(placed, len(claims))
            if not places:
                return {"places": [], "unplaced": unplaced, "status": "below_floor"}
            return {"places": places, "unplaced": unplaced}

        async def synthesize_node(state: ClaimsState) -> dict[str, Any]:
            summary = render_summary(state["places"], state["unplaced"])
            try:
                read = await self._analyst.synthesize(state["question"], summary)
            except InquiryAnalystUnavailable as error:
                return {"status": "failed_retryable", "error": str(error)}

            return {"synthesis": read, "status": "succeeded"}

        builder = StateGraph(ClaimsState)
        builder.add_node("retrieve", retrieve_node)
        builder.add_node("normalise", normalise_node)
        builder.add_node("synthesize", synthesize_node)
        builder.add_edge(START, "retrieve")
        builder.add_conditional_edges("retrieve", _route, {"open": "normalise", "end": END})
        builder.add_conditional_edges("normalise", _route, {"open": "synthesize", "end": END})
        builder.add_edge("synthesize", END)
        return builder.compile()

    async def run(self, run_id: str, input: dict[str, Any]) -> dict[str, Any]:
        question = str(input.get("question") or "").strip()
        if not question:
            raise GraphInputError("an inquiry run needs a question")
        window = str(input.get("window") or "").strip()
        if not window:
            raise GraphInputError("an inquiry run needs a window")

        final = await self._graph.ainvoke(
            {"question": question, "limit": self._limit, "window": window}
        )
        return _result(cast(ClaimsState, final))

    async def stream(self, run_id: str, input: dict[str, Any]) -> AsyncIterator[GraphEvent]:
        yield GraphEvent(runId=run_id, node="inquiry", type="node:start")
        result = await self.run(run_id, input)
        yield GraphEvent(runId=run_id, node="inquiry", type="run:complete", data=result)

    async def resume(self, run_id: str, input: dict[str, Any]) -> dict[str, Any]:
        return await self.run(run_id, input)


def _result(state: ClaimsState) -> dict[str, Any]:
    retrieval = state.get("retrieval")
    return {
        "status": state["status"],
        "error": state.get("error"),
        "places": [to_place_record(group) for group in state.get("places") or []],
        "unplacedClaims": state.get("unplaced") or 0,
        "claimCount": len(retrieval.claims) if retrieval else 0,
        "documentCount": len(retrieval.documents) if retrieval else 0,
        "costUsd": retrieval.cost.usd if retrieval else 0.0,
        "costReported": retrieval.cost.reported if retrieval else False,
        "synthesis": state.get("synthesis"),
    }
