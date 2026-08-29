from typing import Literal, Protocol

from app.ports.attachment_interpreter import AttachmentInterpretation

ImageMediaType = Literal["image/jpeg", "image/png", "image/webp"]


class VisionAttachmentInterpreterPort(Protocol):
    async def interpret_image(
        self, image: bytes, media_type: ImageMediaType, user_text: str
    ) -> AttachmentInterpretation: ...
