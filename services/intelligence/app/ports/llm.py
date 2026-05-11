from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Literal, Protocol


@dataclass(slots=True, frozen=True)
class LLMMessage:
    role: Literal["user", "assistant", "system"]
    content: str


@dataclass(slots=True, frozen=True)
class LLMUsage:
    input_tokens: int
    output_tokens: int


@dataclass(slots=True, frozen=True)
class LLMCompletion:
    content: str
    model: str
    usage: LLMUsage


@dataclass(slots=True, frozen=True)
class LLMOptions:
    max_tokens: int | None = None
    temperature: float | None = None
    system_prompt: str | None = None


class LLMPort(Protocol):
    async def complete(
        self,
        messages: list[LLMMessage],
        options: LLMOptions | None = None,
    ) -> LLMCompletion: ...

    def stream(
        self,
        messages: list[LLMMessage],
        options: LLMOptions | None = None,
    ) -> AsyncIterator[str]: ...
