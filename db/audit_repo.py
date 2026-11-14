"""Audit log repository — records API request metadata.

Stores OS-level information (thread name, PID, timing) alongside
the request details for traceability and monitoring.
"""

import logging

from db.connection import DatabaseManager

logger = logging.getLogger("healthcare.db.audit")


def log_request(
    endpoint: str,
    method: str,
    status_code: int,
    processing_time_ms: float,
    worker_thread: str,
    process_id: int,
    patient_id: int | None = None,
) -> None:
    """Insert an audit log entry."""
    db = DatabaseManager.get_instance()

    def _txn(conn):
        conn.execute(
            """INSERT INTO audit_log
               (endpoint, method, status_code, patient_id,
                processing_time_ms, worker_thread, process_id)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (endpoint, method, status_code, patient_id,
             round(processing_time_ms, 2), worker_thread, process_id),
        )

    try:
        db.execute_transaction(_txn)
    except Exception as e:
        # Audit logging should never crash the request
        logger.warning(f"Audit log write failed: {e}")


def get_recent_logs(limit: int = 50) -> list[dict]:
    """Retrieve the most recent audit log entries."""
    db = DatabaseManager.get_instance()
    rows = db.execute_read(
        "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?",
        (limit,),
    )
    return [dict(r) for r in rows]
