from fastapi import FastAPI

from app.api.graphs import router as graphs_router
from app.api.health import router as health_router


def create_app() -> FastAPI:
    instance = FastAPI(title="atlas-intelligence", version="0.0.0")
    instance.include_router(health_router)
    instance.include_router(graphs_router)
    return instance


app = create_app()
