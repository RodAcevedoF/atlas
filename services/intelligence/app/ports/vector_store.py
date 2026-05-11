from dataclasses import dataclass
from typing import Any, Protocol


@dataclass(slots=True, frozen=True)
class VectorDoc:
    id: str
    vector: list[float]
    payload: dict[str, Any]


@dataclass(slots=True, frozen=True)
class SearchResult:
    id: str
    score: float
    payload: dict[str, Any]


class VectorStorePort(Protocol):
    async def upsert(self, collection: str, docs: list[VectorDoc]) -> None: ...

    async def search(
        self,
        collection: str,
        vector: list[float],
        top_k: int,
        filter: dict[str, Any] | None = None,
    ) -> list[SearchResult]: ...

    async def delete(self, collection: str, ids: list[str]) -> None: ...
