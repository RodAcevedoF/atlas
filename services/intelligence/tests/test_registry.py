from collections.abc import AsyncIterator
from typing import Any

import pytest

from app.core.errors import GraphNotFoundError
from app.core.events import GraphEvent
from app.graphs.registry import GraphRegistry


class StubRunner:
    """Structural match for the GraphRunner protocol — registering it type-checks the
    protocol as much as the registry."""

    def __init__(self, name: str) -> None:
        self.name = name

    async def run(self, run_id: str, input: dict[str, Any]) -> dict[str, Any]:
        return {"graph": self.name, "runId": run_id}

    def stream(
        self, run_id: str, input: dict[str, Any], attempt: int
    ) -> AsyncIterator[GraphEvent]:
        return self._events(run_id)

    async def _events(self, run_id: str) -> AsyncIterator[GraphEvent]:
        yield GraphEvent(runId=run_id, node=self.name, type="run:complete")

    async def resume(self, run_id: str, input: dict[str, Any]) -> dict[str, Any]:
        return {"graph": self.name, "runId": run_id}


class TestGraphRegistry:
    def test_a_registered_graph_is_resolvable_by_name(self) -> None:
        registry = GraphRegistry()
        runner = StubRunner("world-scan")
        registry.register("world-scan", runner)

        resolved = registry.get("world-scan")

        assert resolved is runner

    def test_resolving_an_unknown_name_fails_loudly_and_names_the_graph(self) -> None:
        registry = GraphRegistry()
        registry.register("world-scan", StubRunner("world-scan"))

        with pytest.raises(GraphNotFoundError) as excinfo:
            registry.get("nope")

        assert "nope" in str(excinfo.value)

    def test_registering_a_name_twice_leaves_the_later_runner_in_charge(self) -> None:
        registry = GraphRegistry()
        replacement = StubRunner("second")
        registry.register("world-scan", StubRunner("first"))

        registry.register("world-scan", replacement)

        assert registry.get("world-scan") is replacement

    def test_graphs_are_invisible_to_other_registries(self) -> None:
        first = GraphRegistry()
        second = GraphRegistry()

        first.register("world-scan", StubRunner("world-scan"))

        with pytest.raises(GraphNotFoundError):
            second.get("world-scan")
