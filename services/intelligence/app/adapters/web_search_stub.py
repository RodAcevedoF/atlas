from app.core.errors import NotImplementedAdapterError
from app.ports.web_search import WebSearchResult


class StubWebSearchAdapter:
    async def search(self, query: str, k: int = 5) -> list[WebSearchResult]:
        raise NotImplementedAdapterError("StubWebSearchAdapter.search")
