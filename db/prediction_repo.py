"""Prediction repository — read operations for the predictions table."""

import logging

from db.connection import DatabaseManager

logger = logging.getLogger("healthcare.db.prediction")


def get_predictions_for_patient(patient_id: int) -> list[dict]:
    """Get all predictions for a given patient (JOIN demonstration)."""
    db = DatabaseManager.get_instance()
    rows = db.execute_read(
        "SELECT * FROM predictions WHERE patient_id = ? ORDER BY disease",
        (patient_id,),
    )
    return [dict(r) for r in rows]


def get_prediction_stats() -> list[dict]:
    """Aggregate prediction statistics grouped by disease.

    Demonstrates SQL GROUP BY, COUNT, SUM, AVG on the predictions table.
    """
    db = DatabaseManager.get_instance()
    rows = db.execute_read(
        """SELECT disease,
                  COUNT(*)           AS total,
                  SUM(prediction)    AS positive,
                  ROUND(AVG(probability), 4) AS avg_probability
           FROM predictions
           GROUP BY disease
           ORDER BY disease"""
    )
    return [dict(r) for r in rows]


def get_patient_with_predictions(patient_id: int) -> dict | None:
    """Retrieve patient data joined with their predictions.

    Demonstrates a SQL JOIN across two related tables.
    """
    db = DatabaseManager.get_instance()
    rows = db.execute_read(
        """SELECT p.id AS patient_id, p.age, p.gender, p.created_at,
                  pr.disease, pr.prediction, pr.probability
           FROM patients p
           JOIN predictions pr ON p.id = pr.patient_id
           WHERE p.id = ?
           ORDER BY pr.disease""",
        (patient_id,),
    )
    if not rows:
        return None

    result = {
        "patient_id": rows[0]["patient_id"],
        "age": rows[0]["age"],
        "gender": rows[0]["gender"],
        "created_at": rows[0]["created_at"],
        "predictions": [
            {
                "disease": r["disease"],
                "prediction": bool(r["prediction"]),
                "probability": r["probability"],
            }
            for r in rows
        ],
    }
    return result
