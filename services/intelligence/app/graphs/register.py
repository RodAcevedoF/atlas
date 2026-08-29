from app.adapters.exa_claims import ExaClaimSource, ExaPricing
from app.adapters.langchain_analyst import LangChainAnalyst
from app.adapters.langchain_attachment_interpreter import LangChainAttachmentInterpreter
from app.adapters.langchain_normaliser import LangChainPlaceNormaliser
from app.adapters.langchain_vision_attachment_interpreter import (
    LangChainVisionAttachmentInterpreter,
)
from app.core.config import settings
from app.graphs.attachment_interpretation import AttachmentInterpretationGraph
from app.graphs.claims_lens import ClaimsLensGraph
from app.graphs.registry import registry

EXA_TIMEOUT_SECONDS = 60.0


def _pricing() -> ExaPricing:
    return ExaPricing(
        search_per_1k=settings.exa_price_search_per_1k,
        extra_result_per_1k=settings.exa_price_extra_result_per_1k,
        content_page_per_1k=settings.exa_price_content_page_per_1k,
        included_results=settings.exa_search_included_results,
    )


def register_graphs() -> None:
    """Populate the graph registry. Called once at app startup."""
    if not settings.exa_api_key:
        raise ValueError("EXA_API_KEY is missing")

    registry.register(
        "inquiry",
        ClaimsLensGraph(
            source=ExaClaimSource(
                api_key=settings.exa_api_key,
                pricing=_pricing(),
                search_type=settings.exa_search_type,
                timeout_seconds=EXA_TIMEOUT_SECONDS,
            ),
            normaliser=LangChainPlaceNormaliser(settings),
            analyst=LangChainAnalyst(settings),
            limit=settings.exa_results,
        ),
    )
    registry.register(
        "attachment-interpretation",
        AttachmentInterpretationGraph(
            LangChainAttachmentInterpreter(settings),
            LangChainVisionAttachmentInterpreter(settings),
        ),
    )
