from langchain_core.language_models import BaseChatModel
from pydantic import SecretStr

from app.core.config import Settings


def make_chat_model(settings: Settings) -> BaseChatModel:
    """Provider factory brick — returns a LangChain chat model chosen by config.

    Both OpenAI and Cerebras speak the OpenAI-compatible surface, so downstream graph
    nodes call `.with_structured_output(...)` uniformly regardless of which is selected.
    Swap providers by setting `INTELLIGENCE_LLM_PROVIDER`; add a new one by adding a branch.
    """
    provider = settings.llm_provider.lower()
    if provider == "openai":
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            model=settings.llm_model,
            api_key=_secret(settings.openai_api_key),
            temperature=0,
        )
    if provider == "cerebras":
        from langchain_cerebras import ChatCerebras

        return ChatCerebras(
            model=settings.llm_model,
            api_key=_secret(settings.cerebras_api_key),
            temperature=0,
        )
    raise ValueError(f"unknown llm provider: {settings.llm_provider!r}")


def _secret(value: str | None) -> SecretStr | None:
    """Wrap a key for the LangChain client; None lets the client fall back to its own env var."""
    return SecretStr(value) if value else None
