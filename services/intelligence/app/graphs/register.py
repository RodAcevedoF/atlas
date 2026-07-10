from app.core.config import settings
from app.graphs.registry import registry
from app.graphs.world_scan import WorldScanGraph


def register_graphs() -> None:
    """Populate the graph registry. Called once at app startup."""
    registry.register("world-scan", WorldScanGraph(settings))
