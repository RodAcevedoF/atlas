import json
from collections.abc import AsyncIterator
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.graphs import router
from app.core.errors import GraphInputError
from app.core.events import GraphEvent, RunEnvelope
from app.graphs.registry import registry

GRAPH = "refusing-graph"
ENVELOPE_GRAPH = "envelope-graph"
LEGACY_GRAPH = "legacy-graph"


class RefusingRunner:
    """A graph that refuses the input it was handed, the way the claims lens refuses a
    run with no window."""

    async def run(self, run_id: str, input: dict[str, Any]) -> dict[str, Any]:
        raise GraphInputError("an inquiry run needs a window")

    def stream(
        self, run_id: str, input: dict[str, Any], attempt: int
    ) -> AsyncIterator[GraphEvent]:
        raise NotImplementedError("the stream path is not under test")

    async def resume(self, run_id: str, input: dict[str, Any]) -> dict[str, Any]:
        raise GraphInputError("an inquiry run needs a window")


class EnvelopeRunner:
    """A graph whose stream speaks the versioned run envelope, the way the claims lens
    does after P2."""

    async def run(self, run_id: str, input: dict[str, Any]) -> dict[str, Any]:
        return {"status": "succeeded"}

    async def stream(
        self, run_id: str, input: dict[str, Any], attempt: int
    ) -> AsyncIterator[GraphEvent | RunEnvelope]:
        yield RunEnvelope(
            runId=run_id,
            attempt=attempt,
            sequence=1,
            type="run_complete",
            durationMs=0,
            data={"result": {"status": "succeeded"}},
        )

    async def resume(self, run_id: str, input: dict[str, Any]) -> dict[str, Any]:
        return {"status": "succeeded"}


class LegacyRunner:
    """A graph still speaking plain GraphEvents, the way attachment interpretation does."""

    async def run(self, run_id: str, input: dict[str, Any]) -> dict[str, Any]:
        return {"summary": "s"}

    async def stream(
        self, run_id: str, input: dict[str, Any], attempt: int
    ) -> AsyncIterator[GraphEvent]:
        yield GraphEvent(runId=run_id, node="legacy", type="run:complete", data={"summary": "s"})

    async def resume(self, run_id: str, input: dict[str, Any]) -> dict[str, Any]:
        return {"summary": "s"}


def _data_frames(body: str) -> list[dict[str, Any]]:
    lines = [line for line in body.split("\n") if line.startswith("data: ")]
    return [json.loads(line.removeprefix("data: ")) for line in lines]


@pytest.fixture
def client() -> TestClient:
    registry.register(GRAPH, RefusingRunner())
    registry.register(ENVELOPE_GRAPH, EnvelopeRunner())
    registry.register(LEGACY_GRAPH, LegacyRunner())
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


class TestStreamWire:
    def test_an_attempt_below_one_is_refused_before_any_work_starts(
        self, client: TestClient
    ) -> None:
        response = client.post(
            f"/graphs/{ENVELOPE_GRAPH}/stream", json={"input": {}, "attempt": 0}
        )

        assert response.status_code == 422

    def test_envelope_frames_ride_the_graph_event_stream(self, client: TestClient) -> None:
        response = client.post(
            f"/graphs/{ENVELOPE_GRAPH}/stream",
            json={"input": {}, "runId": "run-9", "attempt": 2},
        )

        assert response.status_code == 200
        assert "event: graph" in response.text
        frames = _data_frames(response.text)
        assert frames == [
            {
                "schemaVersion": 1,
                "runId": "run-9",
                "attempt": 2,
                "sequence": 1,
                "type": "run_complete",
                "occurredAt": frames[0]["occurredAt"],
                "durationMs": 0,
                "data": {"result": {"status": "succeeded"}},
            }
        ]

    def test_a_legacy_graph_still_streams_its_old_frames_unchanged(
        self, client: TestClient
    ) -> None:
        response = client.post(f"/graphs/{LEGACY_GRAPH}/stream", json={"input": {}})

        assert response.status_code == 200
        frames = _data_frames(response.text)
        assert len(frames) == 1
        assert frames[0]["type"] == "run:complete"
        assert "schemaVersion" not in frames[0]
