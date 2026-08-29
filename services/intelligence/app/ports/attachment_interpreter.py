from dataclasses import dataclass
from typing import Any, Protocol


@dataclass(slots=True, frozen=True)
class AttachmentInterpretation:
    summary: str
    facts: list[str]
    entities: list[str]
    proposed_question: str
    needs_clarification: bool
    clarification_question: str | None


class AttachmentInterpreterPort(Protocol):
    async def interpret(
        self, profile: dict[str, Any], user_text: str
    ) -> AttachmentInterpretation: ...
