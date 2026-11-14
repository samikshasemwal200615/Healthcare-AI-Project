"""Structured logging configuration for the Healthcare AI application."""

import logging
import sys

from app.config import LOG_LEVEL


def setup_logging() -> logging.Logger:
    """Configure and return the application logger.

    Sets up a structured formatter with timestamps, log levels, and
    module names for easy debugging and demonstration.
    """
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)-30s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(getattr(logging, LOG_LEVEL.upper(), logging.INFO))

    # Avoid duplicate handlers on reload
    if not root.handlers:
        root.addHandler(handler)

    # Suppress noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

    return logging.getLogger("healthcare")
