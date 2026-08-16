"""AwarenessAnalystPort over a LangChain chat model (provider chosen by config)."""

from typing import Any, cast

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel

from app.adapters.chat_model import make_chat_model
from app.core.config import Settings

QUERY_SYSTEM_PROMPT = """You translate a user's question into a GDELT DOC 2.0 search query.

Rules:
- Output query terms only — never prose, never an explanation.
- Prefer proper nouns, place names and organisation names, which survive translation into other \
languages. Avoid English-only phrasing, idiom and abstract nouns: the query is matched against \
press in many languages, and English-shaped terms measure English-language press only.
- Quote multi-word phrases. Combine alternatives with OR. Keep it under 12 terms — GDELT matches \
literally, so a long query narrows to nothing.
- Do not add a date, a country or a language filter. The caller owns the window and the \
per-country breakdown."""

# The distribution is the finding
SYNTHESIS_SYSTEM_PROMPT = """You read a per-country press-attention distribution and report what \
its shape says.

The measurement: for each country, what share of that country's own monitored press output \
matched the query. It is normalized against each country's own volume, so a small country and a \
large one are comparable.

Rules — hard constraints:
- Report ATTENTION ONLY. This data cannot show approval, sentiment, mood or opinion. A country \
covering something heavily tells you nothing about whether it is for or against it.
- Name the silence explicitly. Countries with near-zero coverage are a finding, not missing data \
— they are the half of the answer a headline list cannot give you.
- Cite countries by name and quote their figures from the data you were given. Never introduce a \
country that is not in the data.
- Where a country is marked `thin`, say so when you lean on it — its figure rests on few buckets.
- Be brief: a few sentences on who is loud, who is quiet, and the pattern that connects them. If \
the distribution has no discernible pattern, say that plainly rather than inventing one."""


class _ExpandedQuery(BaseModel):
    query: str


class _Synthesis(BaseModel):
    read: str


class LangChainAnalyst:
    """The chat model is built lazily so registration at startup never needs a provider key."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._chat_model: Any | None = None

    def _model(self) -> Any:
        if self._chat_model is None:
            self._chat_model = make_chat_model(self._settings)
        return self._chat_model

    async def expand_query(self, question: str) -> str:
        structured = self._model().with_structured_output(_ExpandedQuery)
        result = await structured.ainvoke(
            [SystemMessage(content=QUERY_SYSTEM_PROMPT), HumanMessage(content=question)]
        )
        query = cast(_ExpandedQuery, result).query.strip()
        if not query:
            raise ValueError("query expansion produced nothing to measure")
        return query

    async def synthesize(self, question: str, distribution_summary: str) -> str:
        structured = self._model().with_structured_output(_Synthesis)
        result = await structured.ainvoke(
            [
                SystemMessage(content=SYNTHESIS_SYSTEM_PROMPT),
                HumanMessage(content=f"Question: {question}\n\n{distribution_summary}"),
            ]
        )
        return cast(_Synthesis, result).read
