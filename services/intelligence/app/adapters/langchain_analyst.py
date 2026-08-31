"""InquiryAnalystPort over a LangChain chat model (provider chosen by config)."""

from __future__ import annotations

from typing import cast

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field, field_validator

from app.adapters.chat_model import LazyChatModel
from app.core.config import Settings
from app.ports.analyst import InquiryAnalysis, InquiryAnalystUnavailable, PlaceRead

SYNTHESIS_SYSTEM_PROMPT = """You read a set of claims that news articles make about a question, \
each already placed at the location the claim says the thing happened, and report what the \
distribution says.

The measurement: articles matching the question were retrieved, factual claims were extracted \
from them, and each claim was placed at the location of the event it describes — never at the \
publisher's location. Claim counts per place are what the map paints.

Rules — hard constraints:
- Report WHERE THINGS ARE HAPPENING, per the claims. This is not a measure of press attention, \
and it says nothing about approval, sentiment or opinion.
- Cite places by name and quote their claim counts from the data you were given. Never introduce \
a place that is not in the data.
- These are extracted claims from press reporting, not verified facts. Say "reported" or \
"claimed", never assert an event as established.
- A place carrying one low-confidence claim is weak evidence — do not build the read on it \
without saying so.
- Name what is concentrated and what is scattered. A single dominant location and a wide spread \
are different answers, and the shape is the finding.
- Be brief: a few sentences. If the claims have no discernible geographic pattern, say that \
plainly rather than inventing one.
- A place marked [place-read candidate] may receive one short place_read. Do not create a \
place_read for an unmarked place. Its place and country must exactly match the input, and its \
source_urls must be a non-empty list copied exactly from the claim lines used for that read. \
Never cite a URL from another place. A place_read is optional when the claims do not support a \
useful synthesis."""


class _PlaceRead(BaseModel):
    place: str
    country: str | None
    text: str
    source_urls: list[str]


def _has_place_read_shape(value: object) -> bool:
    if not isinstance(value, dict):
        return False
    country = value.get("country")
    source_urls = value.get("source_urls")
    return (
        isinstance(value.get("place"), str)
        and "country" in value
        and (country is None or isinstance(country, str))
        and isinstance(value.get("text"), str)
        and isinstance(source_urls, list)
        and all(isinstance(source_url, str) for source_url in source_urls)
    )


class _Synthesis(BaseModel):
    read: str
    place_reads: list[_PlaceRead] = Field(default_factory=list)

    @field_validator("place_reads", mode="before")
    @classmethod
    def discard_malformed_place_reads(cls, value: object) -> object:
        if not isinstance(value, list):
            return []
        return [place_read for place_read in value if _has_place_read_shape(place_read)]


class LangChainAnalyst:
    def __init__(self, settings: Settings) -> None:
        self._chat_model = LazyChatModel(settings)

    async def synthesize(self, question: str, places_summary: str) -> InquiryAnalysis:
        structured = self._chat_model.get().with_structured_output(_Synthesis)
        try:
            result = await structured.ainvoke(
                [
                    SystemMessage(content=SYNTHESIS_SYSTEM_PROMPT),
                    HumanMessage(content=f"Question: {question}\n\n{places_summary}"),
                ]
            )
        except Exception as error:
            raise InquiryAnalystUnavailable(f"synthesis failed: {error}") from error

        synthesis = cast(_Synthesis, result)
        return InquiryAnalysis(
            synthesis=synthesis.read,
            place_reads=[
                PlaceRead(
                    place=place_read.place,
                    country=place_read.country,
                    text=place_read.text,
                    source_urls=place_read.source_urls,
                )
                for place_read in synthesis.place_reads
            ],
        )
