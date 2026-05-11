from typing import Protocol


class EmbeddingPort(Protocol):
    @property
    def dimension(self) -> int: ...

    async def embed(self, texts: list[str]) -> list[list[float]]: ...
