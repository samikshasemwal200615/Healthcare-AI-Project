"""History endpoints — query persisted patients, predictions, and audit logs.

Demonstrates database READ operations, JOINs, aggregation,
and FK-based CASCADE deletes.
"""

from fastapi import APIRouter, HTTPException, Query

from db.patient_repo import get_patient, get_all_patients, delete_patient
from db.prediction_repo import (
    get_predictions_for_patient,
    get_prediction_stats,
)
from db.audit_repo import get_recent_logs
from db.connection import DatabaseManager

router = APIRouter(prefix="/history", tags=["History"])


@router.get("/patients")
def list_patients(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """List all patients with pagination (newest first)."""
    patients = get_all_patients(limit=limit, offset=offset)
    total = DatabaseManager.get_instance().execute_read_one(
        "SELECT COUNT(*) AS count FROM patients"
    )
    return {
        "total": total["count"] if total else 0,
        "patients": patients,
    }


@router.get("/patients/{patient_id}")
def get_patient_detail(patient_id: int):
    """Get a patient and their predictions (demonstrates FK relationship)."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    predictions = get_predictions_for_patient(patient_id)
    return {
        "patient": patient,
        "predictions": predictions,
    }


@router.delete("/patients/{patient_id}")
def remove_patient(patient_id: int):
    """Delete a patient — CASCADE deletes associated predictions.

    Demonstrates FK ON DELETE CASCADE: removing the parent row
    automatically removes all child rows in the predictions table.
    """
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    delete_patient(patient_id)
    return {
        "message": f"Patient {patient_id} and associated predictions deleted"
    }


@router.get("/stats")
def prediction_stats():
    """Aggregate prediction statistics (demonstrates GROUP BY, AVG, SUM)."""
    stats = get_prediction_stats()
    total = DatabaseManager.get_instance().execute_read_one(
        "SELECT COUNT(*) AS count FROM patients"
    )
    return {
        "total_patients": total["count"] if total else 0,
        "disease_stats": stats,
    }


@router.get("/audit")
def audit_log(limit: int = Query(50, ge=1, le=200)):
    """Retrieve recent audit log entries (OS monitoring data)."""
    return {"logs": get_recent_logs(limit=limit)}
