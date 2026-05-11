import json
from collections.abc import AsyncIterator
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from app.core.errors import GraphNotFoundError
from app.core.events import GraphEvent
from app.graphs.registry import registry

router = APIRouter(prefix="/graphs")


class RunBody(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    input: dict[str, Any] = Field(default_factory=dict)
    run_id: str | None = None


class ResumeBody(BaseModel):
    input: dict[str, Any] = Field(default_factory=dict)


@router.post("/{name}/run")
async def run_graph(name: str, body: RunBody) -> dict[str, Any]:
    try:
        runner = registry.get(name)
    except GraphNotFoundError:
        raise HTTPException(status_code=404, detail="graph not found") from None
    run_id = body.run_id or str(uuid4())
    return await runner.run(run_id=run_id, input=body.input)


@router.post("/{name}/stream")
async def stream_graph(name: str, body: RunBody) -> StreamingResponse:
    run_id = body.run_id or str(uuid4())

    async def event_source() -> AsyncIterator[bytes]:
        try:
            runner = registry.get(name)
        except GraphNotFoundError:
            event = GraphEvent(
                runId=run_id,
                node="",
                type="run:error",
                data={"error": "graph not found"},
            )
            yield _sse(event)
            return
        async for event in runner.stream(run_id=run_id, input=body.input):
            yield _sse(event)

    return StreamingResponse(event_source(), media_type="text/event-stream")


@router.post("/{name}/resume/{run_id}")
async def resume_graph(name: str, run_id: str, body: ResumeBody) -> dict[str, Any]:
    try:
        runner = registry.get(name)
    except GraphNotFoundError:
        raise HTTPException(status_code=404, detail="graph not found") from None
    return await runner.resume(run_id=run_id, input=body.input)


def _sse(event: GraphEvent) -> bytes:
    return f"event: graph\ndata: {json.dumps(event.to_json())}\n\n".encode()
