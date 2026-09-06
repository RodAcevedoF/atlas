import logging.config
from typing import Any

from app.core.config import Settings

DEFAULT_FORMAT = "%(asctime)s %(levelprefix)s %(name)-30s %(message)s"
ACCESS_FORMAT = '%(asctime)s %(levelprefix)s %(client_addr)s "%(request_line)s" %(status_code)s'
TIME_FORMAT = "%H:%M:%S"


class UvicornErrorAlias(logging.Filter):
    """Uvicorn logs every lifecycle message through a logger literally named `uvicorn.error`."""

    def filter(self, record: logging.LogRecord) -> bool:
        if record.name == "uvicorn.error":
            record.name = "uvicorn"
        return True


def logging_config(settings: Settings) -> dict[str, Any]:
    level = settings.log_level
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "()": "uvicorn.logging.DefaultFormatter",
                "fmt": DEFAULT_FORMAT,
                "datefmt": TIME_FORMAT,
                "use_colors": settings.log_colors,
            },
            "access": {
                "()": "uvicorn.logging.AccessFormatter",
                "fmt": ACCESS_FORMAT,
                "datefmt": TIME_FORMAT,
                "use_colors": settings.log_colors,
            },
        },
        "filters": {
            "uvicorn_error_alias": {"()": UvicornErrorAlias},
        },
        "handlers": {
            "default": {
                "class": "logging.StreamHandler",
                "formatter": "default",
                "stream": "ext://sys.stderr",
                "filters": ["uvicorn_error_alias"],
            },
            "access": {
                "class": "logging.StreamHandler",
                "formatter": "access",
                "stream": "ext://sys.stdout",
            },
        },
        "loggers": {
            "app": {"handlers": ["default"], "level": level, "propagate": False},
            "uvicorn": {"handlers": ["default"], "level": level, "propagate": False},
            "uvicorn.error": {"level": level},
            "uvicorn.access": {"handlers": ["access"], "level": level, "propagate": False},
        },
        "root": {"handlers": ["default"], "level": "WARNING"},
    }


def configure_logging(settings: Settings) -> None:
    logging.config.dictConfig(logging_config(settings))
