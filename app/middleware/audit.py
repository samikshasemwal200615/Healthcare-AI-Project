"""Audit middleware — logs every HTTP request to the audit_log table.

Demonstrates OS concepts:
- threading.current_thread().name — identifies which thread handles the request
- os.getpid() — reports the OS process ID
- time.perf_counter() — high-resolution timing for performance measurement

This middleware is non-blocking: if the audit DB write fails,
the request still completes normally.
"""

import os
import time
import logging
import threading

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("healthcare.audit")


class AuditMiddleware(BaseHTTPMiddleware):
    """Captures request metadata and persists it to the audit_log table."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()

        response = await call_next(request)

        elapsed_ms = (time.perf_counter() - start) * 1000
        thread_name = threading.current_thread().name
        pid = os.getpid()

        logger.info(
            f"{request.method} {request.url.path} -> {response.status_code} "
            f"| {elapsed_ms:.1f}ms | thread={thread_name} | pid={pid}"
        )

        # Persist to audit_log (non-critical — failures are logged, not raised)
        try:
            from db.audit_repo import log_request

            log_request(
                endpoint=request.url.path,
                method=request.method,
                status_code=response.status_code,
                processing_time_ms=elapsed_ms,
                worker_thread=thread_name,
                process_id=pid,
            )
        except Exception as e:
            logger.warning(f"Audit log write failed: {e}")

        return response
