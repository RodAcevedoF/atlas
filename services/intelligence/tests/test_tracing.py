import os

import pytest

from app.core.config import Settings
from app.core.tracing import install_tracing

TRACING_VARS = ("LANGSMITH_TRACING", "LANGSMITH_API_KEY", "LANGSMITH_PROJECT", "LANGSMITH_ENDPOINT")


@pytest.fixture(autouse=True)
def restore_tracing_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in TRACING_VARS:
        monkeypatch.setenv(name, os.environ.get(name, ""))


def configured(
    *, tracing: bool, api_key: str | None = None, project: str = "atlas-intelligence"
) -> Settings:
    return Settings(
        langsmith_tracing=tracing,
        langsmith_api_key=api_key,
        langsmith_project=project,
    )


class TestTracingInstall:
    def test_an_enabled_trace_reaches_the_process_env(self) -> None:
        settings = configured(tracing=True, api_key="ls-test-key", project="atlas-test")

        enabled = install_tracing(settings)

        assert enabled is True
        assert os.environ["LANGSMITH_TRACING"] == "true"
        assert os.environ["LANGSMITH_API_KEY"] == "ls-test-key"
        assert os.environ["LANGSMITH_PROJECT"] == "atlas-test"

    def test_tracing_off_leaves_the_sdk_switched_off(self) -> None:
        enabled = install_tracing(configured(tracing=False))

        assert enabled is False
        assert os.environ["LANGSMITH_TRACING"] == "false"

    def test_tracing_on_without_a_key_fails_loudly(self) -> None:
        settings = configured(tracing=True, api_key=None)

        with pytest.raises(ValueError, match="LANGSMITH_API_KEY"):
            install_tracing(settings)
