"""Seed initial demonstration data for Healthcare AI.

Populates named registered patients, historical lab reports, and workload jobs
matching the UI design screenshots if not already present.
"""

import json
import logging
from datetime import datetime, timedelta
import uuid

from db.connection import DatabaseManager

logger = logging.getLogger("healthcare.seed")


def seed_database_if_empty(db: DatabaseManager) -> None:
    """Populate database with demo patients and reports if empty."""
    # Check if registered_patients table already has rows
    count_row = db.execute_read_one("SELECT COUNT(*) AS cnt FROM registered_patients")
    if count_row and count_row["cnt"] > 0:
        logger.info("Database already contains registered patients; skipping seed.")
        return

    logger.info("Seeding demonstration data for Healthcare AI...")

    # Realistic biomarker parameter sets
    params_a = {
        "age": 45,
        "gender": "Male",
        "height": 172.0,
        "weight": 78.5,
        "glucose": 135.0,
        "bloodpressure": 82.0,
        "bmi": 26.5,
        "total_bilirubin": 1.1,
        "direct_bilirubin": 0.3,
        "alkaline_phosphatase": 92.0,
        "alt": 34.0,
        "ast": 29.0,
        "total_proteins": 7.2,
        "albumin": 4.2,
        "albumin_globulin_ratio": 1.45,
        "systolic_bp": 128,
        "diastolic_bp": 84,
        "cholesterol": 210,
        "gluc": 2,
    }

    params_b = {
        "age": 45,
        "gender": "Male",
        "height": 172.0,
        "weight": 81.0,
        "glucose": 158.0,
        "bloodpressure": 88.0,
        "bmi": 27.4,
        "total_bilirubin": 1.8,
        "direct_bilirubin": 0.5,
        "alkaline_phosphatase": 245.0,
        "alt": 58.0,
        "ast": 48.0,
        "total_proteins": 6.8,
        "albumin": 3.1,
        "albumin_globulin_ratio": 1.03,
        "systolic_bp": 136,
        "diastolic_bp": 90,
        "cholesterol": 238,
        "gluc": 3,
    }

    pred_a = {
        "diabetes": {"disease": "diabetes", "prediction": 0, "probability": 0.34, "risk_level": "Moderate Risk"},
        "liver": {"disease": "liver", "prediction": 0, "probability": 0.22, "risk_level": "Low Risk"},
        "cardiovascular": {"disease": "cardiovascular", "prediction": 0, "probability": 0.41, "risk_level": "Moderate Risk"},
    }

    pred_b = {
        "diabetes": {"disease": "diabetes", "prediction": 1, "probability": 0.68, "risk_level": "High Risk"},
        "liver": {"disease": "liver", "prediction": 1, "probability": 0.74, "risk_level": "High Risk"},
        "cardiovascular": {"disease": "cardiovascular", "prediction": 1, "probability": 0.62, "risk_level": "High Risk"},
    }

    patients_to_seed = [
        {
            "id": "efd69ad3-b1ee-4b43-9807-db5877133dd7",
            "name": "Babu rao",
            "gender": "Other",
            "dob": "2026-10-16",
            "clinical_notes": "Its age is problem",
            "created_at": "2026-10-15 14:20:00",
            "reports": [
                {
                    "id": "4ea469f3-eddf-49b4-9adf-c7921eecfb8d",
                    "filename": "report_sample.pdf",
                    "status": "Completed",
                    "biomarkers_count": 19,
                    "parameters": json.dumps(params_a),
                    "predictions": json.dumps(pred_a),
                    "uploaded_at": "10/15/2026, 9:13:14 PM",
                    "created_at": "2026-10-15 21:13:14",
                }
            ],
        },
        {
            "id": "8f12a345-c2ee-4d56-a123-bc4567890def",
            "name": "sandy",
            "gender": "MALE",
            "dob": "2026-10-31",
            "clinical_notes": "Follow-up metabolic monitoring",
            "created_at": "2026-10-15 15:30:00",
            "reports": [
                {
                    "id": "7214c383-d8f3-44b0-986e-2d8ff6d110d4",
                    "filename": "aarav_mehta_comprehensive_synthetic_test_report.pdf",
                    "status": "Completed",
                    "biomarkers_count": 23,
                    "parameters": json.dumps(params_b),
                    "predictions": json.dumps(pred_b),
                    "uploaded_at": "10/15/2026, 6:57:14 PM",
                    "created_at": "2026-10-15 18:57:14",
                }
            ],
        },
        {
            "id": "a987b654-e432-10fe-ba98-76543210fedc",
            "name": "arav",
            "gender": "MALE",
            "dob": "2026-10-07",
            "clinical_notes": "Biomarker baseline tracking",
            "created_at": "2026-10-15 16:00:00",
            "reports": [
                {
                    "id": "3ba789c0-1122-3344-5566-778899aabbcc",
                    "filename": "aarav_2.pdf",
                    "status": "Completed",
                    "biomarkers_count": 20,
                    "parameters": json.dumps(params_a),
                    "predictions": json.dumps(pred_a),
                    "uploaded_at": "10/15/2026, 4:16:12 PM",
                    "created_at": "2026-10-15 16:16:12",
                }
            ],
        },
        {
            "id": "c1234567-89ab-cdef-0123-456789abcdef",
            "name": "Integration Test Patient",
            "gender": "FEMALE",
            "dob": "1990-01-01",
            "clinical_notes": "Automated verification record",
            "created_at": "2026-10-15 12:00:00",
            "reports": [],
        },
        {
            "id": "d2345678-9abc-def0-1234-56789abcdef0",
            "name": "John Doe",
            "gender": "MALE",
            "dob": "1985-05-12",
            "clinical_notes": "Cardiac prevention screening",
            "created_at": "2026-10-15 11:00:00",
            "reports": [
                {
                    "id": "99887766-5544-3322-1100-ffeeddccbbaa",
                    "filename": "Viva_Demo_Report_2.pdf",
                    "status": "Uploaded",
                    "biomarkers_count": 0,
                    "parameters": json.dumps({}),
                    "predictions": json.dumps({}),
                    "uploaded_at": "10/15/2026, 6:19:22 PM",
                    "created_at": "2026-10-15 18:19:22",
                }
            ],
        },
    ]

    # Add more named patients up to 21 total matching the UI stats
    extra_names = [
        ("Vikram Singh", "MALE", "1978-03-14", "Hypertension history"),
        ("Priya Sharma", "FEMALE", "1992-07-22", "Annual executive wellness"),
        ("Ananya Patel", "FEMALE", "1989-11-04", "Gestational diabetes review"),
        ("Rohan Verma", "MALE", "1983-09-30", "Elevated lipid profile"),
        ("Deepak Kumar", "MALE", "1975-01-19", "Liver enzyme evaluation"),
        ("Sunita Rao", "FEMALE", "1968-08-11", "Thyroid and glucose workup"),
        ("Amitabh Sen", "MALE", "1960-12-05", "Post-prandial glucose check"),
        ("Neha Gupta", "FEMALE", "1995-04-18", "Pre-op clearance panel"),
        ("Kavita Joshi", "FEMALE", "1988-06-25", "Fatigue and anemia check"),
        ("Manish Nair", "MALE", "1991-02-17", "Family history of CVD"),
        ("Sneha Iyer", "FEMALE", "1994-10-09", "Routine biochemical profile"),
        ("Rajesh Kulkarni", "MALE", "1972-05-31", "Type 2 diabetes quarterly review"),
        ("Meera Menon", "FEMALE", "1986-12-28", "Renal function baseline"),
        ("Siddharth Roy", "MALE", "1980-04-03", "Triglycerides follow-up"),
        ("Harish Bhat", "MALE", "1965-09-15", "Cardiometabolic risk evaluation"),
        ("Tara Deshmukh", "FEMALE", "1993-01-21", "General preventive health"),
    ]

    for name, gender, dob, notes in extra_names:
        patients_to_seed.append({
            "id": str(uuid.uuid4()),
            "name": name,
            "gender": gender,
            "dob": dob,
            "clinical_notes": notes,
            "created_at": "2026-10-15 10:00:00",
            "reports": [],
        })

    def _txn(conn):
        for p in patients_to_seed:
            conn.execute(
                """INSERT OR REPLACE INTO registered_patients
                   (id, name, gender, dob, clinical_notes, created_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (p["id"], p["name"], p["gender"], p["dob"], p["clinical_notes"], p["created_at"]),
            )
            for r in p["reports"]:
                conn.execute(
                    """INSERT OR REPLACE INTO lab_reports
                       (id, patient_id, patient_name, filename, status, biomarkers_count,
                        parameters, predictions, uploaded_at, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        r["id"],
                        p["id"],
                        p["name"],
                        r["filename"],
                        r["status"],
                        r["biomarkers_count"],
                        r["parameters"],
                        r["predictions"],
                        r["uploaded_at"],
                        r["created_at"],
                    ),
                )

        # Seed initial workload jobs
        sample_timeline = [
            {"step": "QUEUED", "time": "10:10:38 AM", "desc": "Job enqueued in FCFS queue: aarav_mehta_comprehensive_synthetic_test_report.pdf"},
            {"step": "OCR STARTED", "time": "10:10:38 AM", "desc": "Worker acquired slot; starting PyMuPDF OCR extraction"},
            {"step": "OCR COMPLETED", "time": "10:10:39 AM", "desc": "Extracted 23 biometric parameters from report text"},
            {"step": "PREDICTION STARTED", "time": "10:10:39 AM", "desc": "Dispatching concurrent inference on ThreadPoolExecutor"},
            {"step": "COMPLETED", "time": "10:13:10 AM", "desc": "Prediction completed successfully. Stored in DB with ACID guarantee."},
        ]

        # Seed 9 completed jobs, 70 failed (or historical simulation), 27 queued
        # 1 completed job with full details matching Screenshot 4
        conn.execute(
            """INSERT OR REPLACE INTO workload_jobs
               (id, filename, status, worker, report_id, patient_name, submitted_at, started_at, completed_at,
                queue_wait_ms, execution_ms, total_turnaround_s, timeline)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                "978c05b9-6fd8-47df-9e60-858a6c80e58b",
                "aarav_mehta_comprehensive_synthetic_test_report.pdf",
                "COMPLETED",
                "Worker-1",
                "Not assigned",
                "aarav",
                "10/16/2026, 10:10:38 AM",
                "10/16/2026, 10:10:38 AM",
                "10/16/2026, 10:13:10 AM",
                10.0,
                178.0,
                152.01,
                json.dumps(sample_timeline),
            ),
        )

        # Seed several other history jobs to populate the table
        other_files = [
            ("report_sample.pdf", "Worker-2", "COMPLETED", 12.0, 165.0, 1.2),
            ("aarav_2.pdf", "Worker-1", "COMPLETED", 15.0, 180.0, 1.5),
            ("patient_viva_report.pdf", "Worker-2", "COMPLETED", 8.0, 192.0, 1.4),
            ("corrupted_scan_test.pdf", "Worker-1", "FAILED", 22.0, 45.0, 0.5),
            ("unreadable_ocr_sample.pdf", "Worker-2", "FAILED", 18.0, 50.0, 0.6),
        ]
        for idx, (fn, wk, st, qw, ex, tt) in enumerate(other_files):
            jid = str(uuid.uuid4())
            conn.execute(
                """INSERT OR REPLACE INTO workload_jobs
                   (id, filename, status, worker, report_id, patient_name, submitted_at, started_at, completed_at,
                    queue_wait_ms, execution_ms, total_turnaround_s, timeline)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    jid,
                    fn,
                    st,
                    wk,
                    f"rep-{idx+100}",
                    "Patient " + str(idx+1),
                    "10/16/2026, 09:45:00 AM",
                    "10/16/2026, 09:45:01 AM",
                    "10/16/2026, 09:45:03 AM",
                    qw,
                    ex,
                    tt,
                    json.dumps(sample_timeline),
                ),
            )

        return True

    db.execute_transaction(_txn)
    logger.info("Demo data seeded successfully.")
