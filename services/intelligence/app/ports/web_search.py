from dataclasses import dataclass
from typing import Protocol


@dataclass(slots=True, frozen=True)
class WebSearchResult:
    url: str
    title: str
    snippet: str
    score: float | None = None


class WebSearchPort(Protocol):
    async def search(self, query: str, k: int = 5) -> list[WebSearchResult]: ...
