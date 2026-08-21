"""AwarenessAnalystPort over a LangChain chat model (provider chosen by config)."""

from collections.abc import Sequence
from typing import Any, cast

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from pydantic import BaseModel

from app.adapters.chat_model import make_chat_model
from app.core.config import Settings
from app.ports.awareness import RejectedQuery

QUERY_SYSTEM_PROMPT = """You translate a user's question into a GDELT DOC 2.0 search query.

The query is matched LITERALLY against press in every language. A term written only in English \
therefore matches only English-language press — and the caller reads the countries it missed as \
silent. Producing that false silence is the worst thing you can do here.

The user is always asking the same underlying thing: how much press attention some subject is \
getting. Query the SUBJECT ONLY. Words belonging to the asking — attention, coverage, reporting, \
media, press, world, anyone — must never enter the query. The caller measures attention itself; \
requiring an article to literally contain "attention" would match almost nothing.

Rules:
- Output the query only — never prose, never an explanation.
- Anchor on proper nouns (places, people, organisations); these already survive translation.
- Every term that is NOT a proper noun must be OR-ed with its equivalents in the main languages \
of the region the question concerns, in those languages' own scripts. Never let a concept enter \
the query in one language alone.
- A phrase is only a proper noun if the whole of it is a name. "Amazon deforestation" is not — it \
is the place Amazon plus the concept deforestation, and the concept still needs its equivalents. \
Split such a phrase rather than quoting it whole.
- Group with parentheses and join the groups with AND: \
`Sudan AND (famine OR hambruna OR famine OR مجاعة OR fome)`. Exactly one level of nesting — AND \
joins the groups, OR joins alternatives inside a group, and an AND never appears inside a group.
- List an alternative only where it actually differs. Never pad a group by repeating a term. \
Where a word is identical across languages, say it once and spend the group on real variants \
instead — other names for the same thing, older or clinical names, common transliterations.
- A multi-word concept stays ONE group, its alternatives whole phrases: \
`("gang violence" OR "violence des gangs" OR "violencia de pandillas")`, never \
`(gang OR …) AND (violence OR …)` — splitting it demands both words and narrows to nothing.
- Quote multi-word phrases, words separated by spaces. Never join words with an underscore.
- Prefer ONE group; use a second only when the subject needs a place anchor plus a distinct \
concept. Never three — GDELT matches literally, so each extra group narrows the result, while \
extra OR alternatives inside a group only widen coverage.
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


def _expansion_messages(question: str, rejected: Sequence[RejectedQuery]) -> list[BaseMessage]:
    """Each refusal is replayed as the turn it was, so the model corrects rather than rerolls."""
    messages: list[BaseMessage] = [
        SystemMessage(content=QUERY_SYSTEM_PROMPT),
        HumanMessage(content=question),
    ]
    for attempt in rejected:
        messages.append(AIMessage(content=attempt.query))
        messages.append(
            HumanMessage(
                content=(
                    f"That query is unusable: {attempt.reason}. "
                    "Return a corrected query for the same question."
                )
            )
        )
    return messages


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

    async def expand_query(self, question: str, rejected: Sequence[RejectedQuery]) -> str:
        structured = self._model().with_structured_output(_ExpandedQuery)
        result = await structured.ainvoke(_expansion_messages(question, rejected))
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
