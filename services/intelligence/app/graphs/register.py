from app.adapters.gdelt_awareness import GdeltAwarenessSource
from app.adapters.langchain_analyst import LangChainAnalyst
from app.core.config import settings
from app.graphs.awareness_lens import AwarenessLensGraph
from app.graphs.registry import registry
from app.graphs.world_scan import WorldScanGraph

GDELT_TIMEOUT_SECONDS = 30.0


def register_graphs() -> None:
    """Populate the graph registry. Called once at app startup."""
    registry.register("world-scan", WorldScanGraph(settings))
    registry.register(
        "awareness",
        AwarenessLensGraph(
            source=GdeltAwarenessSource(GDELT_TIMEOUT_SECONDS),
            analyst=LangChainAnalyst(settings),
        ),
    )
