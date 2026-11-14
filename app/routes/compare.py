"""Compare Reports API route.

Calculates biometric parameter deltas and longitudinal disease risk trajectories
between two lab reports (Report A - Baseline, Report B - Follow-up).
"""

import json
import logging
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query

from db.connection import DatabaseManager

logger = logging.getLogger("healthcare.routes.compare")

router = APIRouter(prefix="/compare", tags=["Compare Reports"])

# Parameter metadata: human-readable name and standard medical units
PARAMETER_METADATA = {
    "age": ("Age", "years"),
    "gender": ("Gender", "—"),
    "height": ("Height", "cm"),
    "weight": ("Weight", "kg"),
    "bmi": ("Body Mass Index (BMI)", "kg/m²"),
    "bloodpressure": ("Blood Pressure", "mmHg"),
    "systolic_bp": ("Systolic Blood Pressure", "mmHg"),
    "diastolic_bp": ("Diastolic Blood Pressure", "mmHg"),
    "glucose": ("Fasting Blood Glucose", "mg/dL"),
    "insulin": ("Serum Insulin", "µIU/mL"),
    "skinthickness": ("Skin Thickness", "mm"),
    "diabetespedigreefunction": ("Diabetes Pedigree Function", "score"),
    "total_bilirubin": ("Total Bilirubin", "mg/dL"),
    "direct_bilirubin": ("Direct Bilirubin", "mg/dL"),
    "alkaline_phosphatase": ("Alkaline Phosphatase", "IU/L"),
    "alt": ("ALT (SGPT)", "IU/L"),
    "ast": ("AST (SGOT)", "IU/L"),
    "total_proteins": ("Total Proteins", "g/dL"),
    "albumin": ("Albumin", "g/dL"),
    "albumin_globulin_ratio": ("Albumin Globulin Ratio", "ratio"),
    "cholesterol": ("Total Cholesterol", "mg/dL"),
    "gluc": ("Glucose Level Category", "cat"),
    "smoke": ("Smoking Habit", "boolean"),
    "alco": ("Alcohol Intake", "boolean"),
    "active": ("Physical Activity", "boolean"),
}


@router.get("/reports")
def list_available_reports():
    """List all available lab reports with patient info for selection in comparison dropdown."""
    db = DatabaseManager.get_instance()
    rows = db.execute_read(
        """SELECT r.id, r.filename, r.status, r.uploaded_at, r.created_at,
                  p.name AS patient_name, p.id AS patient_id
           FROM lab_reports r
           LEFT JOIN registered_patients p ON r.patient_id = p.id
           ORDER BY r.created_at DESC"""
    )
    return {"reports": [dict(r) for r in rows]}


@router.get("/")
def compare_reports(
    report_a: str = Query(..., description="ID of baseline report A"),
    report_b: str = Query(..., description="ID of follow-up report B"),
):
    """Compare two lab reports side-by-side."""
    db = DatabaseManager.get_instance()

    row_a = db.execute_read_one("SELECT * FROM lab_reports WHERE id = ?", (report_a,))
    row_b = db.execute_read_one("SELECT * FROM lab_reports WHERE id = ?", (report_b,))

    if not row_a or not row_b:
        raise HTTPException(
            status_code=404,
            detail="One or both reports could not be found."
        )

    dict_a = dict(row_a)
    dict_b = dict(row_b)

    # Parse JSON
    params_a = json.loads(dict_a["parameters"]) if isinstance(dict_a["parameters"], str) else (dict_a["parameters"] or {})
    params_b = json.loads(dict_b["parameters"]) if isinstance(dict_b["parameters"], str) else (dict_b["parameters"] or {})
    preds_a = json.loads(dict_a["predictions"]) if isinstance(dict_a["predictions"], str) else (dict_a["predictions"] or {})
    preds_b = json.loads(dict_b["predictions"]) if isinstance(dict_b["predictions"], str) else (dict_b["predictions"] or {})

    # Calculate parameter delta table
    all_keys = list(dict.fromkeys(list(params_a.keys()) + list(params_b.keys())))
    # Order by known parameters
    ordered_keys = [k for k in PARAMETER_METADATA.keys() if k in all_keys] + [k for k in all_keys if k not in PARAMETER_METADATA]

    parameters_comparison = []
    for k in ordered_keys:
        val_a = params_a.get(k)
        val_b = params_b.get(k)
        label, unit = PARAMETER_METADATA.get(k, (k.replace("_", " ").title(), "—"))

        # Check numeric delta
        delta_str = "—"
        trend = "= Stable"
        if isinstance(val_a, (int, float)) and isinstance(val_b, (int, float)):
            num_delta = round(val_b - val_a, 2)
            if num_delta > 0:
                delta_str = f"+{int(num_delta) if num_delta.is_integer() else num_delta}"
                trend = "↑ Increased"
            elif num_delta < 0:
                delta_str = f"{int(num_delta) if num_delta.is_integer() else num_delta}"
                trend = "↓ Decreased"
            else:
                delta_str = "0"
                trend = "= Stable"
        elif val_a == val_b:
            delta_str = "0"
            trend = "= Stable"
        else:
            trend = "Changed"

        parameters_comparison.append({
            "key": k,
            "parameter": label,
            "report_a": val_a if val_a is not None else "—",
            "report_b": val_b if val_b is not None else "—",
            "unit": unit,
            "numerical_delta": delta_str,
            "clinical_trend": trend,
        })

    # Calculate disease risk trajectories
    trajectories = []
    disease_display_names = {
        "diabetes": "Type 2 Diabetes Risk",
        "liver": "Liver Disease Risk",
        "cardiovascular": "Cardiovascular Disease Risk",
    }

    all_diseases = list(dict.fromkeys(list(preds_a.keys()) + list(preds_b.keys())))
    if not all_diseases:
        all_diseases = ["diabetes", "liver", "cardiovascular"]

    for d in all_diseases:
        info_a = preds_a.get(d, {})
        info_b = preds_b.get(d, {})

        prob_a = float(info_a.get("probability", 0.0))
        prob_b = float(info_b.get("probability", 0.0))
        delta_prob = round(prob_b - prob_a, 3)

        if delta_prob > 0.05:
            traj_tag = "↑ Increased Risk"
            trend_color = "red"
        elif delta_prob < -0.05:
            traj_tag = "↓ Decreased Risk"
            trend_color = "green"
        else:
            traj_tag = "= Stable Risk"
            trend_color = "slate"

        trajectories.append({
            "disease_key": d,
            "disease_name": disease_display_names.get(d, d.replace("_", " ").title()),
            "report_a_prob": prob_a,
            "report_b_prob": prob_b,
            "report_a_level": info_a.get("risk_level", "Unknown"),
            "report_b_level": info_b.get("risk_level", "Unknown"),
            "probability_delta": delta_prob,
            "trajectory": traj_tag,
            "trend_color": trend_color,
        })

    return {
        "report_a": {
            "id": dict_a["id"],
            "filename": dict_a["filename"],
            "patient_name": dict_a.get("patient_name") or "Patient",
            "uploaded_at": dict_a["uploaded_at"],
            "status": dict_a["status"],
        },
        "report_b": {
            "id": dict_b["id"],
            "filename": dict_b["filename"],
            "patient_name": dict_b.get("patient_name") or "Patient",
            "uploaded_at": dict_b["uploaded_at"],
            "status": dict_b["status"],
        },
        "disease_trajectories": trajectories,
        "parameters_comparison": parameters_comparison,
    }
