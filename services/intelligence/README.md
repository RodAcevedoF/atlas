# @atlas/intelligence

Atlas Python intelligence microservice — FastAPI + LangGraph. Exposes `OrchestrationPort`-shaped HTTP endpoints (`/graphs/{name}/run`, `/stream`, `/resume/{runId}`) consumed by the TS API through the planned `orchestration-http` adapter.

## Setup

```bash
cd services/intelligence
uv sync
```

## Run

```bash
bun nx run @atlas/intelligence:dev         # uvicorn with reload
bun nx run @atlas/intelligence:typecheck   # mypy strict
bun nx run @atlas/intelligence:lint        # ruff
```

## Config

| Env var               | Default     | Notes                       |
| --------------------- | ----------- | --------------------------- |
| `INTELLIGENCE_HOST`   | `127.0.0.1` | uvicorn bind host           |
| `INTELLIGENCE_PORT`   | `8000`      | uvicorn bind port           |
| `INTELLIGENCE_RELOAD` | `true`      | uvicorn `--reload` flag     |

## Endpoints

| Method | Path                            | Notes                                |
| ------ | ------------------------------- | ------------------------------------ |
| GET    | `/health`                       | liveness                             |
| POST   | `/graphs/{name}/run`            | sync run; 404 if name not registered |
| POST   | `/graphs/{name}/stream`         | SSE `GraphEvent` stream              |
| POST   | `/graphs/{name}/resume/{runId}` | resume a paused run                  |

The graph registry is currently empty — every graph-name call returns 404 (or a `run:error` SSE event). The Intelligence graph lands in the next M2 slice.
