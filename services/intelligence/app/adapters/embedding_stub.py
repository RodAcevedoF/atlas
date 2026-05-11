from app.core.errors import NotImplementedAdapterError


class StubEmbeddingAdapter:
    @property
    def dimension(self) -> int:
        raise NotImplementedAdapterError("StubEmbeddingAdapter.dimension")

    async def embed(self, texts: list[str]) -> list[list[float]]:
        raise NotImplementedAdapterError("StubEmbeddingAdapter.embed")
