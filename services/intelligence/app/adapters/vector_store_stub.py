from typing import Any

from app.core.errors import NotImplementedAdapterError
from app.ports.vector_store import SearchResult, VectorDoc


class StubVectorStoreAdapter:
    async def upsert(self, collection: str, docs: list[VectorDoc]) -> None:
        raise NotImplementedAdapterError("StubVectorStoreAdapter.upsert")

    async def search(
        self,
        collection: str,
        vector: list[float],
        top_k: int,
        filter: dict[str, Any] | None = None,
    ) -> list[SearchResult]:
        raise NotImplementedAdapterError("StubVectorStoreAdapter.search")

    async def delete(self, collection: str, ids: list[str]) -> None:
        raise NotImplementedAdapterError("StubVectorStoreAdapter.delete")
