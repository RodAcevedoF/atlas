from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="INTELLIGENCE_",
        env_file=".env",
        populate_by_name=True,
        extra="ignore",
    )

    host: str = "127.0.0.1"
    port: int = 8000
    reload: bool = True
    log_level: str = "INFO"
    log_colors: bool = True

    llm_provider: str = "openai"
    llm_model: str = "gpt-4o-mini"
    vision_model: str = "gpt-4o-mini"
    openai_api_key: str | None = None
    cerebras_api_key: str | None = None

    exa_api_key: str | None = Field(default=None, validation_alias="EXA_API_KEY")
    exa_search_type: str = "auto"
    exa_results: int = 25

    exa_price_search_per_1k: float = 7.0
    exa_price_extra_result_per_1k: float = 1.0
    exa_price_content_page_per_1k: float = 1.0
    exa_search_included_results: int = 10

    langsmith_tracing: bool = Field(default=False, validation_alias="LANGSMITH_TRACING")
    langsmith_api_key: str | None = Field(default=None, validation_alias="LANGSMITH_API_KEY")
    langsmith_project: str = Field(
        default="atlas-intelligence", validation_alias="LANGSMITH_PROJECT"
    )
    langsmith_endpoint: str = Field(
        default="https://api.smith.langchain.com", validation_alias="LANGSMITH_ENDPOINT"
    )


settings = Settings()
