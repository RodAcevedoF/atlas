import base64
from typing import cast

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import SecretStr

from app.adapters.langchain_attachment_interpreter import (
    StructuredAttachmentInterpretation,
    to_attachment_interpretation,
)
from app.core.config import Settings
from app.ports.attachment_interpreter import AttachmentInterpretation
from app.ports.vision_attachment_interpreter import ImageMediaType

SYSTEM_PROMPT = """You read one attached image to help form an Atlas research question. Extract \
only visible text, named entities, chart or table facts, and a concise description. Never claim \
facts that are not visible. Atlas uses this interpretation only to choose a current press-research \
question; pixels and visible places never become map data.

Use the optional user text as intent. Propose one concrete question suitable for current web \
research. If that intent is genuinely unclear, set needsClarification and ask one short question. \
Otherwise clarificationQuestion is null. User text may contain a prior proposal plus a \
clarification answer or refinement request; honor the latest user direction while staying grounded \
in the same visible image. The proposed question must be at most 500 characters."""


class LangChainVisionAttachmentInterpreter:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._model: ChatOpenAI | None = None

    async def interpret_image(
        self, image: bytes, media_type: ImageMediaType, user_text: str
    ) -> AttachmentInterpretation:
        encoded = base64.b64encode(image).decode("ascii")
        structured = self._chat_model().with_structured_output(
            StructuredAttachmentInterpretation
        )
        result = cast(
            StructuredAttachmentInterpretation,
            await structured.ainvoke(
                [
                    SystemMessage(content=SYSTEM_PROMPT),
                    HumanMessage(
                        content=[
                            {
                                "type": "text",
                                "text": user_text or "Interpret this image and propose a question.",
                            },
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:{media_type};base64,{encoded}"},
                            },
                        ]
                    ),
                ]
            ),
        )
        return to_attachment_interpretation(result)

    def _chat_model(self) -> ChatOpenAI:
        if self._model is None:
            self._model = ChatOpenAI(
                model=self._settings.vision_model,
                api_key=(
                    SecretStr(self._settings.openai_api_key)
                    if self._settings.openai_api_key
                    else None
                ),
                temperature=0,
            )
        return self._model
