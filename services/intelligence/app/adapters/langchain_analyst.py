"""InquiryAnalystPort over a LangChain chat model (provider chosen by config)."""

from __future__ import annotations

from typing import cast

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel

from app.adapters.chat_model import LazyChatModel
from app.core.config import Settings
from app.ports.analyst import InquiryAnalystUnavailable

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
plainly rather than inventing one."""


class _Synthesis(BaseModel):
    read: str


class LangChainAnalyst:
    def __init__(self, settings: Settings) -> None:
        self._chat_model = LazyChatModel(settings)

    async def synthesize(self, question: str, places_summary: str) -> str:
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

        return cast(_Synthesis, result).read
