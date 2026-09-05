import json
from collections.abc import AsyncIterator
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from app.core.errors import GraphInputError, GraphNotFoundError
from app.core.events import GraphEvent, RunEnvelope
from app.graphs.registry import registry

router = APIRouter(prefix="/graphs")


class RunBody(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    input: dict[str, Any] = Field(default_factory=dict)
    run_id: str | None = None
    attempt: int = Field(default=1, ge=1)


class ResumeBody(BaseModel):
    input: dict[str, Any] = Field(default_factory=dict)


@router.post("/{name}/run")
async def run_graph(name: str, body: RunBody) -> dict[str, Any]:
    try:
        runner = registry.get(name)
    except GraphNotFoundError:
        raise HTTPException(status_code=404, detail="graph not found") from None
    run_id = body.run_id or str(uuid4())
    try:
        return await runner.run(run_id=run_id, input=body.input)
    except GraphInputError as error:
        raise HTTPException(status_code=422, detail=str(error)) from None


@router.post("/{name}/stream")
async def stream_graph(name: str, body: RunBody) -> StreamingResponse:
    run_id = body.run_id or str(uuid4())

    async def event_source() -> AsyncIterator[bytes]:
        try:
            runner = registry.get(name)
        except GraphNotFoundError:
            missing = GraphEvent(
                runId=run_id,
                node="",
                type="run:error",
                data={"error": "graph not found"},
            )
            yield _sse(missing)
            return
        async for event in runner.stream(run_id=run_id, input=body.input, attempt=body.attempt):
            yield _sse(event)

    return StreamingResponse(event_source(), media_type="text/event-stream")


@router.post("/{name}/resume/{run_id}")
async def resume_graph(name: str, run_id: str, body: ResumeBody) -> dict[str, Any]:
    try:
        runner = registry.get(name)
    except GraphNotFoundError:
        raise HTTPException(status_code=404, detail="graph not found") from None
    try:
        return await runner.resume(run_id=run_id, input=body.input)
    except GraphInputError as error:
        raise HTTPException(status_code=422, detail=str(error)) from None


def _sse(event: GraphEvent | RunEnvelope) -> bytes:
    return f"event: graph\ndata: {json.dumps(event.to_json())}\n\n".encode()
