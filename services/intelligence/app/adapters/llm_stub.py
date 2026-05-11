from collections.abc import AsyncIterator

from app.core.errors import NotImplementedAdapterError
from app.ports.llm import LLMCompletion, LLMMessage, LLMOptions


class StubLLMAdapter:
    async def complete(
        self,
        messages: list[LLMMessage],
        options: LLMOptions | None = None,
    ) -> LLMCompletion:
        raise NotImplementedAdapterError("StubLLMAdapter.complete")

    def stream(
        self,
        messages: list[LLMMessage],
        options: LLMOptions | None = None,
    ) -> AsyncIterator[str]:
        raise NotImplementedAdapterError("StubLLMAdapter.stream")
