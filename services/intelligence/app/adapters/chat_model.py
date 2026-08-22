from langchain_core.language_models import BaseChatModel
from pydantic import SecretStr

from app.core.config import Settings


def make_chat_model(settings: Settings) -> BaseChatModel:
    """Provider factory returns a LangChain chat model chosen by config.
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


class LazyChatModel:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._model: BaseChatModel | None = None

    def get(self) -> BaseChatModel:
        if self._model is None:
            self._model = make_chat_model(self._settings)
        return self._model


def _secret(value: str | None) -> SecretStr | None:
    return SecretStr(value) if value else None
