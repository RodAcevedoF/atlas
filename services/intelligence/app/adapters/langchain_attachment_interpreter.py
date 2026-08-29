import json
from typing import Any, cast

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from app.adapters.chat_model import LazyChatModel
from app.core.config import Settings
from app.ports.attachment_interpreter import AttachmentInterpretation

SYSTEM_PROMPT = """You turn a bounded spreadsheet profile and optional user text into one \
Atlas research question. Atlas researches current press claims and maps the locations where the \
claims say events happened. The spreadsheet is context for choosing the question; its rows never \
become map data.

Use only the supplied profile. Summarize what the table visibly contains, extract concise facts \
and named entities, and propose one concrete question suitable for current web research. Do not \
invent facts hidden by sampling or truncation. If the user's research intent is genuinely unclear, \
set needsClarification and ask one short clarification question. Otherwise clarificationQuestion \
is null. The proposed question must be at most 500 characters."""


class StructuredAttachmentInterpretation(BaseModel):
    summary: str
    facts: list[str] = Field(max_length=12)
    entities: list[str] = Field(max_length=20)
    proposed_question: str = Field(alias="proposedQuestion", max_length=500)
    needs_clarification: bool = Field(alias="needsClarification")
    clarification_question: str | None = Field(alias="clarificationQuestion")


class LangChainAttachmentInterpreter:
    def __init__(self, settings: Settings) -> None:
        self._chat_model = LazyChatModel(settings)

    async def interpret(
        self, profile: dict[str, Any], user_text: str
    ) -> AttachmentInterpretation:
        structured = self._chat_model.get().with_structured_output(
            StructuredAttachmentInterpretation
        )
        result = cast(
            StructuredAttachmentInterpretation,
            await structured.ainvoke(
                [
                    SystemMessage(content=SYSTEM_PROMPT),
                    HumanMessage(
                        content=json.dumps(
                            {"tableProfile": profile, "userText": user_text},
                            ensure_ascii=False,
                        )
                    ),
                ]
            ),
        )
        return to_attachment_interpretation(result)


def to_attachment_interpretation(
    result: StructuredAttachmentInterpretation,
) -> AttachmentInterpretation:
    return AttachmentInterpretation(
        summary=result.summary,
        facts=result.facts,
        entities=result.entities,
        proposed_question=result.proposed_question,
        needs_clarification=result.needs_clarification,
        clarification_question=result.clarification_question,
    )
