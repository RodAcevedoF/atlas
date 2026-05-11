from collections.abc import AsyncIterator
from typing import Any, Protocol

from app.core.errors import GraphNotFoundError
from app.core.events import GraphEvent


class GraphRunner(Protocol):
    async def run(self, run_id: str, input: dict[str, Any]) -> dict[str, Any]: ...

    def stream(self, run_id: str, input: dict[str, Any]) -> AsyncIterator[GraphEvent]: ...

    async def resume(self, run_id: str, input: dict[str, Any]) -> dict[str, Any]: ...


class GraphRegistry:
    def __init__(self) -> None:
        self._graphs: dict[str, GraphRunner] = {}

    def register(self, name: str, runner: GraphRunner) -> None:
        self._graphs[name] = runner

    def get(self, name: str) -> GraphRunner:
        runner = self._graphs.get(name)
        if runner is None:
            raise GraphNotFoundError(name)
        return runner


registry = GraphRegistry()
