"""The `world-scan` graph.

Fuses attention (news signals) and expectation (market movers) over a time window into
a change-and-divergence report. Built as a small LangGraph pipeline of composable bricks:

    scope-gate ─┬─(enough)→ generate ─→ ground-citations ─→ END
                └─(thin)──────────────→ ground-citations ─→ END

The provider is a swappable brick (`make_chat_model`); the guardrails are reusable bricks
(`app.graphs.guardrails`). The factual report header is assembled upstream in the TS API —
this graph produces only the narrative the model is qualified to write.
"""

import json
from collections.abc import AsyncIterator
from typing import Any, TypedDict, cast

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from app.adapters.chat_model import make_chat_model
from app.core.config import Settings
from app.core.events import GraphEvent
from app.graphs.guardrails import collect_source_tags, ground_citations, has_enough_coverage


class _Camel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Development(_Camel):
    title: str
    where: str
    why_it_matters: str
    citations: list[str]


class Divergence(_Camel):
    topic: str
    region: str
    attention: str
    expectation: str
    read: str
    citations: list[str]


class RegionNote(_Camel):
    region: str
    note: str


class Coverage(_Camel):
    sources_used: list[str]
    gaps: list[str]
    note: str


class ReportNarrative(_Camel):
    developments: list[Development]
    divergences: list[Divergence]
    region_notes: list[RegionNote]
    coverage: Coverage


SYSTEM_PROMPT = """You are Atlas's world-scan analyst. You are given two epistemically \
different streams over a recent time window: NEWS SIGNALS (attention — what is being \
talked about) and MARKET MOVERS (expectation — where prediction-market money moved, with \
volume and price deltas). Your job is to report what CHANGED and where the money DISAGREES \
with the headlines.

Rules — these are hard constraints, not suggestions:
- Every development and every divergence MUST cite one or more `ref` values taken VERBATIM \
from the provided data. Never invent a ref. If you cannot cite it, do not claim it.
- This data is attention + expectation. It is NEVER sentiment, mood, or public opinion. Do \
not describe feelings the data cannot support.
- The divergence section is the point: name topics/regions where news volume and market \
movement disagree, and give your read on which side is likely right and why. Each divergence \
MUST cite at least one news `ref` AND at least one market `ref` that are about the SAME topic \
or region — it compares the two sides on one subject. Never pad a divergence with an unrelated \
ref just to satisfy this. If a subject has movement on only one side, it is not a divergence.
- Keep an honest coverage footer: which sources you used and the known gaps. If the \
evidence is thin, say so plainly rather than padding.
- Prefer 3-5 developments. Ground every sentence in the data; do not narrate beyond it."""


class ScanState(TypedDict):
    payload: dict[str, Any]
    news_tags: dict[str, Any]
    market_tags: dict[str, Any]
    narrative: dict[str, Any]


def _render_user(payload: dict[str, Any]) -> str:
    return json.dumps(payload, ensure_ascii=False)


def _insufficient_narrative() -> dict[str, Any]:
    return {
        "developments": [],
        "divergences": [],
        "regionNotes": [],
        "coverage": {
            "sourcesUsed": [],
            "gaps": ["Not enough signals or market movement in the window to scan."],
            "note": "Insufficient coverage to produce a scan.",
        },
    }


def _scope_node(state: ScanState) -> dict[str, Any]:
    payload = state["payload"]
    news_tags, market_tags = collect_source_tags(payload)
    tags = {"news_tags": news_tags, "market_tags": market_tags}
    if has_enough_coverage(payload):
        return tags
    return {**tags, "narrative": _insufficient_narrative()}


def _route(state: ScanState) -> str:
    return "ground" if state.get("narrative") else "generate"


def _ground_node(state: ScanState) -> dict[str, Any]:
    return {
        "narrative": ground_citations(
            state["narrative"], state["news_tags"], state["market_tags"]
        )
    }


class WorldScanGraph:
    """GraphRunner for `world-scan`. The chat model is built lazily so registration at
    startup never requires a provider key."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._chat_model: Any | None = None
        self._graph = self._build()

    def _model(self) -> Any:
        if self._chat_model is None:
            self._chat_model = make_chat_model(self._settings)
        return self._chat_model

    def _build(self) -> Any:
        async def generate_node(state: ScanState) -> dict[str, Any]:
            structured = self._model().with_structured_output(ReportNarrative)
            messages = [
                SystemMessage(content=SYSTEM_PROMPT),
                HumanMessage(content=_render_user(state["payload"])),
            ]
            result = await structured.ainvoke(messages)
            return {"narrative": cast(ReportNarrative, result).model_dump(by_alias=True)}

        builder = StateGraph(ScanState)
        builder.add_node("scope", _scope_node)
        builder.add_node("generate", generate_node)
        builder.add_node("ground", _ground_node)
        builder.add_edge(START, "scope")
        builder.add_conditional_edges(
            "scope", _route, {"generate": "generate", "ground": "ground"}
        )
        builder.add_edge("generate", "ground")
        builder.add_edge("ground", END)
        return builder.compile()

    async def run(self, run_id: str, input: dict[str, Any]) -> dict[str, Any]:
        final = await self._graph.ainvoke(cast(ScanState, {"payload": input}))
        return cast(dict[str, Any], final["narrative"])

    async def stream(self, run_id: str, input: dict[str, Any]) -> AsyncIterator[GraphEvent]:
        yield GraphEvent(runId=run_id, node="world-scan", type="node:start")
        narrative = await self.run(run_id, input)
        yield GraphEvent(runId=run_id, node="world-scan", type="run:complete", data=narrative)

    async def resume(self, run_id: str, input: dict[str, Any]) -> dict[str, Any]:
        return await self.run(run_id, input)
