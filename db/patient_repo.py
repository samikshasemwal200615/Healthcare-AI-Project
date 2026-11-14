"""Patient repository — CRUD operations for the patients table.

All write operations use execute_transaction() for atomicity and
thread-safe access via the write lock.
"""

import logging

from db.connection import DatabaseManager
from patient.patient import Patient

logger = logging.getLogger("healthcare.db.patient")

# Boolean fields that need int conversion for SQLite
_BOOL_FIELDS = ("smoke", "alco", "active")


def _patient_to_row(patient: Patient) -> dict:
    """Convert a Patient model to a dict suitable for SQLite insertion."""
    fields = patient.model_dump()
    for key in _BOOL_FIELDS:
        if fields[key] is not None:
            fields[key] = int(fields[key])
    return fields


def save_patient_with_predictions(patient: Patient, predictions: dict) -> int:
    """Atomically save a patient and their prediction results.

    Demonstrates ACID Atomicity: the patient row and all 3 prediction
    rows are inserted in a single transaction. If any INSERT fails,
    the entire batch is rolled back — no partial data is stored.

    Args:
        patient: Validated Patient model.
        predictions: Dict of {disease_key: PredictionResult}.

    Returns:
        The auto-generated patient_id.
    """
    db = DatabaseManager.get_instance()

    def _txn(conn):
        # --- Insert patient ---
        row = _patient_to_row(patient)
        columns = ", ".join(row.keys())
        placeholders = ", ".join(["?"] * len(row))
        cursor = conn.execute(
            f"INSERT INTO patients ({columns}) VALUES ({placeholders})",
            tuple(row.values()),
        )
        patient_id = cursor.lastrowid

        # --- Insert predictions (one per disease) ---
        for _key, result in predictions.items():
            conn.execute(
                """INSERT INTO predictions
                   (patient_id, disease, prediction, probability)
                   VALUES (?, ?, ?, ?)""",
                (patient_id, result.disease,
                 int(result.prediction), result.probability),
            )

        logger.info(
            f"Saved patient_id={patient_id} with "
            f"{len(predictions)} predictions"
        )
        return patient_id

    return db.execute_transaction(_txn)


def get_patient(patient_id: int) -> dict | None:
    """Retrieve a single patient by ID."""
    db = DatabaseManager.get_instance()
    row = db.execute_read_one(
        "SELECT * FROM patients WHERE id = ?", (patient_id,)
    )
    return dict(row) if row else None


def get_all_patients(limit: int = 50, offset: int = 0) -> list[dict]:
    """Retrieve patients ordered by newest first (paginated)."""
    db = DatabaseManager.get_instance()
    rows = db.execute_read(
        "SELECT * FROM patients ORDER BY created_at DESC LIMIT ? OFFSET ?",
        (limit, offset),
    )
    return [dict(r) for r in rows]


def delete_patient(patient_id: int) -> bool:
    """Delete a patient (CASCADE deletes associated predictions).

    Demonstrates FK ON DELETE CASCADE — removing a patient
    automatically removes their predictions.
    """
    db = DatabaseManager.get_instance()

    def _txn(conn):
        cursor = conn.execute(
            "DELETE FROM patients WHERE id = ?", (patient_id,)
        )
        return cursor.rowcount > 0

    deleted = db.execute_transaction(_txn)
    if deleted:
        logger.info(f"Deleted patient_id={patient_id} (cascade)")
    return deleted
