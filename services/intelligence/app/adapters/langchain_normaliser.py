"""PlaceNormaliserPort over a LangChain chat model (provider chosen by config)."""

from __future__ import annotations

from collections.abc import Sequence
from typing import cast

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from app.adapters.chat_model import LazyChatModel
from app.core.config import Settings
from app.ports.places import NormalisedPlace, PlaceNormaliserUnavailable

NORMALISE_SYSTEM_PROMPT = """You canonicalise place strings extracted from news articles so they \
can be plotted on a map.

You are given a numbered list of place strings. Return one entry for every input, in the same \
order, each carrying the index it came from.

Rules:
- `name` is the canonical English name of the place, at the most specific level the input \
supports. "Khartoum", "Khartoum, Sudan", "Khartoum state, Sudan" and "Khartoum and central \
Sudan" are all the city Khartoum. "el-Fasher" and "El Fasher" are one place.
- `country` is the canonical English country name the place sits in, or null if the input names \
no country and implies none.
- `latitude` and `longitude` are the place's centre in decimal degrees.
- A string that is not a place on the earth's surface gets null coordinates. Prose like \
"Regional institutions (IGAD)", "Shipping routes near UAE (global context)" or "areas with needs \
most acute" is not a place. Give it null latitude and null longitude rather than guessing.
- A country named on its own IS a place — give it the country's centroid.
- Never invent coordinates you are not confident in. Null is a correct answer; a wrong orb \
is not."""


class _NormalisedPlace(BaseModel):
    index: int = Field(description="the index of the input place string this entry answers")
    name: str
    country: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class _NormalisedPlaces(BaseModel):
    places: list[_NormalisedPlace]


def render_places(places: Sequence[str]) -> str:
    return "\n".join(f"{index}. {place}" for index, place in enumerate(places))


def to_normalised(entry: _NormalisedPlace, raw: str) -> NormalisedPlace:
    """A blank canonical name is unusable, so the raw string stands in and stays unplottable."""
    name = entry.name.strip()
    return NormalisedPlace(
        raw=raw,
        name=name or raw,
        country=(entry.country or "").strip() or None,
        latitude=entry.latitude if name else None,
        longitude=entry.longitude if name else None,
    )


def collect(entries: Sequence[_NormalisedPlace], places: Sequence[str]) -> list[NormalisedPlace]:
    """Indexed rather than zipped — a model that drops or reorders an entry
    must not shift every later place onto the wrong claim.
    """
    by_index = {entry.index: entry for entry in entries}
    return [
        to_normalised(by_index[index], raw) for index, raw in enumerate(places) if index in by_index
    ]


class LangChainPlaceNormaliser:
    def __init__(self, settings: Settings) -> None:
        self._chat_model = LazyChatModel(settings)

    async def normalise(self, places: Sequence[str]) -> list[NormalisedPlace]:
        if not places:
            return []

        structured = self._chat_model.get().with_structured_output(_NormalisedPlaces)
        try:
            result = await structured.ainvoke(
                [
                    SystemMessage(content=NORMALISE_SYSTEM_PROMPT),
                    HumanMessage(content=render_places(places)),
                ]
            )
        except Exception as error:
            raise PlaceNormaliserUnavailable(f"normalisation failed: {error}") from error

        return collect(cast(_NormalisedPlaces, result).places, places)
