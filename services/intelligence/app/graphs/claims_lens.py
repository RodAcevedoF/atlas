from __future__ import annotations

import logging
import time
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any, TypedDict, cast

from langgraph.graph import END, START, StateGraph

from app.core.errors import GraphInputError
from app.core.events import RunEnvelope, RunEnvelopeType
from app.graphs.places import (
    PlacedClaim,
    PlaceGroup,
    distinct_places,
    group_by_place,
    place_claims,
    unplaced_count,
)
from app.ports.analyst import InquiryAnalystPort, InquiryAnalystUnavailable, PlaceRead
from app.ports.claims import (
    Claim,
    ClaimSourcePort,
    ClaimSourceRetryable,
    ClaimSourceUnavailable,
    ClaimsRetrieval,
    SourceDocument,
)
from app.ports.places import PlaceNormaliserPort, PlaceNormaliserUnavailable

DEFAULT_RESULT_LIMIT = 25

# bounds the synthesis prompt.
PLACES_IN_SUMMARY = 20
CLAIMS_PER_PLACE_IN_SUMMARY = 3
PLACE_READ_LIMIT = 5
PLACE_READ_MIN_CLAIMS = 2

logger = logging.getLogger(__name__)


@dataclass(slots=True, frozen=True)
class PlacedRead:
    latitude: float
    longitude: float
    read: PlaceRead


PlaceReads = dict[str, PlacedRead]


def place_key(latitude: float, longitude: float) -> str:
    """a graph state has to stay JSON-serialisable, so coordinates key it as text"""
    return f"{latitude},{longitude}"


class ClaimsState(TypedDict):
    question: str
    limit: int
    window: str
    retrieval: ClaimsRetrieval
    places: list[PlaceGroup]
    unplaced: int
    synthesis: str
    place_reads: PlaceReads
    status: str
    error: str


def _still_open(state: ClaimsState) -> bool:
    """a node sets a status only when it has already ended the run."""
    return state.get("status") is None


def _route(state: ClaimsState) -> str:
    return "open" if _still_open(state) else "end"


def _summary_claims(group: PlaceGroup) -> list[PlacedClaim]:
    ordered = sorted(group.claims, key=lambda item: -item.claim.confidence)
    return ordered[:CLAIMS_PER_PLACE_IN_SUMMARY]


def _claim_line(group: PlaceGroup) -> str:
    return "\n".join(
        f"    - [{item.claim.confidence:.2f}] {item.claim.text} (source: {item.claim.source_url})"
        for item in _summary_claims(group)
    )


def place_read_candidates(places: list[PlaceGroup]) -> list[PlaceGroup]:
    return [group for group in places if len(group.claims) >= PLACE_READ_MIN_CLAIMS][
        :PLACE_READ_LIMIT
    ]


def render_summary(places: list[PlaceGroup], unplaced: int) -> str:
    candidate_coordinates = {
        (group.latitude, group.longitude) for group in place_read_candidates(places)
    }
    lines = [f"{len(places)} places carry claims, most claims first:"]
    for group in places[:PLACES_IN_SUMMARY]:
        where = f"{group.name} ({group.country})" if group.country else group.name
        candidate = (
            " [place-read candidate]"
            if (group.latitude, group.longitude) in candidate_coordinates
            else ""
        )
        lines.append(f"- {where}: {len(group.claims)} claims{candidate}")
        lines.append(_claim_line(group))
    if unplaced:
        lines.append(f"\n{unplaced} further claims could not be placed and are not on the map.")
    return "\n".join(lines)


def _validated_place_reads(places: list[PlaceGroup], proposed: list[PlaceRead]) -> PlaceReads:
    candidates = place_read_candidates(places)
    accepted: PlaceReads = {}
    for place_read in proposed:
        if not place_read.text.strip() or not place_read.source_urls:
            continue
        matching = []
        for group in candidates:
            source_urls = {item.claim.source_url for item in _summary_claims(group)}
            if (
                place_read.place == group.name
                and place_read.country == group.country
                and all(source_url in source_urls for source_url in place_read.source_urls)
            ):
                matching.append(group)
        if len(matching) != 1:
            continue
        group = matching[0]
        key = place_key(group.latitude, group.longitude)
        if key in accepted:
            continue
        accepted[key] = PlacedRead(
            latitude=group.latitude,
            longitude=group.longitude,
            read=PlaceRead(
                place=place_read.place,
                country=place_read.country,
                text=place_read.text.strip(),
                source_urls=list(dict.fromkeys(place_read.source_urls)),
            ),
        )
    return accepted


def _read_record(place_read: PlaceRead) -> dict[str, Any]:
    return {"text": place_read.text, "sourceUrls": place_read.source_urls}


def to_place_record(group: PlaceGroup, place_read: PlaceRead | None = None) -> dict[str, Any]:
    return {
        "place": group.name,
        "country": group.country,
        "latitude": group.latitude,
        "longitude": group.longitude,
        "claimCount": len(group.claims),
        "read": _read_record(place_read) if place_read else None,
        "claims": [_claim_record(item.claim) for item in group.claims],
    }


def to_document_record(document: SourceDocument) -> dict[str, Any]:
    return {
        "url": document.url,
        "title": document.title,
        "publishedDate": document.published_date,
        "text": document.text,
        "highlights": document.highlights,
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
                analysis = await self._analyst.synthesize(state["question"], summary)
            except InquiryAnalystUnavailable as error:
                return {"status": "failed_retryable", "error": str(error)}

            return {
                "synthesis": analysis.synthesis,
                "place_reads": _validated_place_reads(state["places"], analysis.place_reads),
                "status": "succeeded",
            }

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
        result: dict[str, Any] | None = None
        async for envelope in self._execute(run_id, input, attempt=1):
            if envelope.type in ("run_complete", "run_failed"):
                result = envelope.data["result"]
        if result is None:
            raise RuntimeError("the claims lens stream ended without a terminal result")
        return result

    async def stream(
        self, run_id: str, input: dict[str, Any], attempt: int
    ) -> AsyncIterator[RunEnvelope]:
        try:
            async for envelope in self._execute(run_id, input, attempt):
                yield envelope
        except GraphInputError:
            yield RunEnvelope(
                runId=run_id,
                attempt=attempt,
                sequence=1,
                type="run_failed",
                durationMs=0,
                data={"failureClass": "internal", "result": None},
            )

    async def resume(self, run_id: str, input: dict[str, Any]) -> dict[str, Any]:
        return await self.run(run_id, input)

    async def _execute(
        self, run_id: str, input: dict[str, Any], attempt: int
    ) -> AsyncIterator[RunEnvelope]:
        question = str(input.get("question") or "").strip()
        if not question:
            raise GraphInputError("an inquiry run needs a question")
        window = str(input.get("window") or "").strip()
        if not window:
            raise GraphInputError("an inquiry run needs a window")

        logger.info("run %s attempt %s started: %r", run_id, attempt, question)
        state: dict[str, Any] = {"question": question, "limit": self._limit, "window": window}
        started = time.monotonic()
        stage_started = started
        sequence = 0

        def sealed(kind: RunEnvelopeType, duration_ms: int, data: dict[str, Any]) -> RunEnvelope:
            nonlocal sequence
            sequence += 1
            return RunEnvelope(
                runId=run_id,
                attempt=attempt,
                sequence=sequence,
                type=kind,
                durationMs=duration_ms,
                data=data,
            )

        async for update in self._graph.astream(dict(state), stream_mode="updates"):
            stage_ms = int((time.monotonic() - stage_started) * 1000)
            stage_started = time.monotonic()
            for node, delta in update.items():
                state |= delta
                milestones = _milestones(node, delta, cast(ClaimsState, state))
                if milestones:
                    logger.info("run %s %s after %sms", run_id, milestones[0][0], stage_ms)
                for index, (kind, checkpoint) in enumerate(milestones):
                    yield sealed(kind, stage_ms if index == 0 else 0, checkpoint)

        status = state.get("status")
        if status is None:
            raise RuntimeError("the claims lens graph ended without a terminal status")
        result = _result(cast(ClaimsState, state))
        total_ms = int((time.monotonic() - started) * 1000)
        if status in ("failed_retryable", "failed_permanent"):
            logger.warning("run %s %s after %sms: %r", run_id, status, total_ms, state.get("error"))
            yield sealed("run_failed", total_ms, {"failureClass": "transport", "result": result})
            return
        logger.info("run %s %s after %sms", run_id, status, total_ms)
        yield sealed("run_complete", total_ms, {"result": result})


def _milestones(
    node: str, delta: dict[str, Any], state: ClaimsState
) -> list[tuple[RunEnvelopeType, dict[str, Any]]]:
    if delta.get("status") not in (None, "succeeded"):
        return []
    if node == "retrieve":
        return [("retrieval_complete", _retrieval_checkpoint(state["retrieval"]))]
    if node == "normalise":
        return [("map_ready", _map_checkpoint(state))]
    if node == "synthesize":
        reads: list[tuple[RunEnvelopeType, dict[str, Any]]] = [
            ("place_read_ready", _place_read_checkpoint(placed))
            for placed in state["place_reads"].values()
        ]
        return [("synthesis_ready", {"synthesis": state["synthesis"]}), *reads]
    return []


def _retrieval_checkpoint(retrieval: ClaimsRetrieval) -> dict[str, Any]:
    return {
        "claimCount": len(retrieval.claims),
        "documentCount": len(retrieval.documents),
        "costUsd": retrieval.cost.usd,
        "costReported": retrieval.cost.reported,
        "documents": [to_document_record(document) for document in retrieval.documents],
        "claims": [
            _claim_record(claim)
            | {
                "place": {
                    "name": claim.place.name,
                    "country": claim.place.country,
                    "latitude": claim.place.latitude,
                    "longitude": claim.place.longitude,
                }
            }
            for claim in retrieval.claims
        ],
    }


def _claim_record(claim: Claim) -> dict[str, Any]:
    return {
        "text": claim.text,
        "confidence": claim.confidence,
        "sourceUrl": claim.source_url,
        "sourceTitle": claim.source_title,
        "publishedDate": claim.published_date,
        "sourceImageUrl": claim.source_image_url,
    }


def _map_checkpoint(state: ClaimsState) -> dict[str, Any]:
    return {
        "places": [to_place_record(group) for group in state["places"]],
        "unplacedClaims": state["unplaced"],
        "claimCount": len(state["retrieval"].claims),
    }


def _place_read_checkpoint(placed: PlacedRead) -> dict[str, Any]:
    return {
        "place": placed.read.place,
        "country": placed.read.country,
        "latitude": placed.latitude,
        "longitude": placed.longitude,
        "read": _read_record(placed.read),
    }


def _read_for(place_reads: PlaceReads, group: PlaceGroup) -> PlaceRead | None:
    placed = place_reads.get(place_key(group.latitude, group.longitude))
    return placed.read if placed else None


def _result(state: ClaimsState) -> dict[str, Any]:
    retrieval = state.get("retrieval")
    place_reads = state.get("place_reads") or {}
    return {
        "status": state["status"],
        "error": state.get("error"),
        "places": [
            to_place_record(group, _read_for(place_reads, group))
            for group in state.get("places") or []
        ],
        "documents": [to_document_record(document) for document in retrieval.documents]
        if retrieval
        else [],
        "unplacedClaims": state.get("unplaced") or 0,
        "claimCount": len(retrieval.claims) if retrieval else 0,
        "documentCount": len(retrieval.documents) if retrieval else 0,
        "costUsd": retrieval.cost.usd if retrieval else 0.0,
        "costReported": retrieval.cost.reported if retrieval else False,
        "synthesis": state.get("synthesis"),
    }
