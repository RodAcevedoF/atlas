import uvicorn

from app.core.config import settings
from app.core.logging import logging_config


def main() -> None:
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
        log_config=logging_config(settings),
    )


if __name__ == "__main__":
    main()
