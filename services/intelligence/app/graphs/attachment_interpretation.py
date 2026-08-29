import base64
import binascii
from collections.abc import AsyncIterator
from typing import Any

from app.core.errors import GraphInputError
from app.core.events import GraphEvent
from app.ports.attachment_interpreter import (
    AttachmentInterpretation,
    AttachmentInterpreterPort,
)
from app.ports.vision_attachment_interpreter import (
    ImageMediaType,
    VisionAttachmentInterpreterPort,
)

IMAGE_MEDIA_TYPES: tuple[ImageMediaType, ...] = ("image/jpeg", "image/png", "image/webp")
MAX_IMAGE_BYTES = 5 * 1024 * 1024


class AttachmentInterpretationGraph:
    def __init__(
        self,
        interpreter: AttachmentInterpreterPort,
        vision_interpreter: VisionAttachmentInterpreterPort,
    ) -> None:
        self._interpreter = interpreter
        self._vision_interpreter = vision_interpreter

    async def run(self, run_id: str, input: dict[str, Any]) -> dict[str, Any]:
        kind = input.get("kind")
        user_text = str(input.get("userText") or "").strip()
        if kind == "image":
            result = await self._interpret_image(input, user_text)
            return _result(result)
        if kind != "tabular":
            raise GraphInputError("attachment interpretation needs a supported kind")
        profile = input.get("profile")
        if not isinstance(profile, dict):
            raise GraphInputError("attachment interpretation needs a table profile")
        result = await self._interpreter.interpret(profile, user_text)
        return _result(result)

    async def _interpret_image(
        self, input: dict[str, Any], user_text: str
    ) -> AttachmentInterpretation:
        media_type = input.get("mediaType")
        if media_type not in IMAGE_MEDIA_TYPES:
            raise GraphInputError("image attachment needs a supported media type")
        encoded = input.get("bytesBase64")
        if not isinstance(encoded, str):
            raise GraphInputError("image attachment needs bytes")
        try:
            image = base64.b64decode(encoded, validate=True)
        except (binascii.Error, ValueError):
            raise GraphInputError("image attachment bytes are invalid") from None
        if not image or len(image) > MAX_IMAGE_BYTES:
            raise GraphInputError("image attachment size is invalid")
        return await self._vision_interpreter.interpret_image(
            image, media_type, user_text
        )

    async def stream(self, run_id: str, input: dict[str, Any]) -> AsyncIterator[GraphEvent]:
        yield GraphEvent(runId=run_id, node="attachment-interpretation", type="node:start")
        result = await self.run(run_id, input)
        yield GraphEvent(
            runId=run_id,
            node="attachment-interpretation",
            type="run:complete",
            data=result,
        )

    async def resume(self, run_id: str, input: dict[str, Any]) -> dict[str, Any]:
        return await self.run(run_id, input)


def _result(result: AttachmentInterpretation) -> dict[str, Any]:
    return {
        "summary": result.summary,
        "facts": result.facts,
        "entities": result.entities,
        "proposedQuestion": result.proposed_question,
        "needsClarification": result.needs_clarification,
        "clarificationQuestion": result.clarification_question,
    }
