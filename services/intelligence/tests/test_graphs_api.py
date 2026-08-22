from collections.abc import AsyncIterator
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.graphs import router
from app.core.errors import GraphInputError
from app.core.events import GraphEvent
from app.graphs.registry import registry

GRAPH = "refusing-graph"


class RefusingRunner:
    """A graph that refuses the input it was handed, the way the claims lens refuses a
    run with no window."""

    async def run(self, run_id: str, input: dict[str, Any]) -> dict[str, Any]:
        raise GraphInputError("an inquiry run needs a window")

    def stream(self, run_id: str, input: dict[str, Any]) -> AsyncIterator[GraphEvent]:
        raise NotImplementedError("the stream path is not under test")

    async def resume(self, run_id: str, input: dict[str, Any]) -> dict[str, Any]:
        raise GraphInputError("an inquiry run needs a window")


@pytest.fixture
def client() -> TestClient:
    registry.register(GRAPH, RefusingRunner())
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


class TestInputRefusal:
    # a 5xx is what the caller retries; an input the graph can never accept must not look like one.

    def test_a_run_the_graph_refuses_is_not_dressed_up_as_an_outage(
        self, client: TestClient
    ) -> None:
        response = client.post(f"/graphs/{GRAPH}/run", json={"input": {"question": "q"}})

        assert response.status_code == 422
        assert "window" in response.json()["detail"]

    def test_a_resume_the_graph_refuses_is_not_dressed_up_as_an_outage(
        self, client: TestClient
    ) -> None:
        response = client.post(f"/graphs/{GRAPH}/resume/run-1", json={"input": {}})

        assert response.status_code == 422

    def test_an_unknown_graph_is_still_a_404(self, client: TestClient) -> None:
        response = client.post("/graphs/nope/run", json={"input": {}})

        assert response.status_code == 404
