"""Unit and integration tests for DBMS functionality.

Demonstrates:
- Schema initialization (DDL, tables, indexes)
- CRUD operations for patients and predictions
- ACID Transaction Atomicity (all-or-nothing rollback on error)
- ACID Consistency (CHECK constraints and FK validation)
- ACID Isolation (thread-safe transactions via mutex write lock)
- Foreign Key ON DELETE CASCADE
- SQL Aggregations (GROUP BY, COUNT, SUM, AVG)
"""

import os
import tempfile
import threading
import unittest
from pathlib import Path

from db.connection import DatabaseManager
from db.init_db import initialize_database
from db.patient_repo import (
    save_patient_with_predictions,
    get_patient,
    get_all_patients,
    delete_patient,
)
from db.prediction_repo import (
    get_predictions_for_patient,
    get_prediction_stats,
    get_patient_with_predictions,
)
from db.audit_repo import log_request, get_recent_logs
from patient.patient import Patient
from prediction.prediction_result import PredictionResult


class TestDatabaseManager(unittest.TestCase):
    def setUp(self):
        DatabaseManager.reset()
        self.temp_dir = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        self.db_path = str(Path(self.temp_dir.name) / "test_healthcare.db")
        self.db = DatabaseManager.get_instance(self.db_path)
        initialize_database(self.db)

    def tearDown(self):
        import gc
        DatabaseManager.reset()
        gc.collect()
        self.temp_dir.cleanup()

    def test_schema_initialization(self):
        """Verify tables and indexes are created properly."""
        tables = self.db.execute_read(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        table_names = [t["name"] for t in tables]
        self.assertIn("patients", table_names)
        self.assertIn("predictions", table_names)
        self.assertIn("audit_log", table_names)

        # Verify indexes
        indexes = self.db.execute_read(
            "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'"
        )
        index_names = [i["name"] for i in indexes]
        self.assertIn("idx_predictions_patient", index_names)
        self.assertIn("idx_predictions_disease", index_names)
        self.assertIn("idx_audit_log_endpoint", index_names)

    def test_save_patient_and_retrieve(self):
        """Test atomic insert and retrieval of patient and predictions."""
        patient = Patient(
            age=45,
            gender="male",
            height=175.0,
            weight=78.0,
            glucose=110.0,
            bloodpressure=80.0,
            bmi=25.4,
            smoke=False,
            alco=False,
            active=True,
        )
        predictions = {
            "diabetes": PredictionResult(
                disease="Diabetes",
                prediction=0,
                probability=0.25,
            ),
            "liver": PredictionResult(
                disease="Liver Disease",
                prediction=1,
                probability=0.82,
            ),
            "cardiovascular": PredictionResult(
                disease="Cardiovascular Disease",
                prediction=0,
                probability=0.35,
            ),
        }

        patient_id = save_patient_with_predictions(patient, predictions)
        self.assertIsInstance(patient_id, int)
        self.assertGreater(patient_id, 0)

        # Retrieve patient
        fetched_patient = get_patient(patient_id)
        self.assertIsNotNone(fetched_patient)
        self.assertEqual(fetched_patient["age"], 45)
        self.assertEqual(fetched_patient["gender"], "male")
        self.assertEqual(fetched_patient["active"], 1)

        # Retrieve predictions
        preds = get_predictions_for_patient(patient_id)
        self.assertEqual(len(preds), 3)

        # Verify JOIN query
        joined = get_patient_with_predictions(patient_id)
        self.assertIsNotNone(joined)
        self.assertEqual(joined["patient_id"], patient_id)
        self.assertEqual(len(joined["predictions"]), 3)

    def test_acid_atomicity_rollback(self):
        """Test that if any step inside a transaction fails, all changes rollback."""
        patient = Patient(age=30, gender="female", height=160.0, weight=55.0)

        # Try to execute a transaction where the second statement intentionally fails
        def faulty_transaction(conn):
            cursor = conn.execute(
                "INSERT INTO patients (age, gender) VALUES (?, ?)", (30, "female")
            )
            # Intentional SQL error: invalid column name
            conn.execute("INSERT INTO non_existent_table (xyz) VALUES (?)", (1,))
            return cursor.lastrowid

        with self.assertRaises(Exception):
            self.db.execute_transaction(faulty_transaction)

        # Check that NO patient record was saved (atomicity)
        patients = get_all_patients()
        self.assertEqual(len(patients), 0, "Failed transaction was not rolled back!")

    def test_acid_consistency_check_constraints(self):
        """Test DB-level CHECK constraints (negative age or glucose rejected)."""
        # Negative age violates CHECK (age IS NULL OR age > 0)
        def insert_invalid_age(conn):
            conn.execute(
                "INSERT INTO patients (age, gender) VALUES (?, ?)", (-5, "male")
            )

        with self.assertRaises(Exception):
            self.db.execute_transaction(insert_invalid_age)

    def test_foreign_key_cascade_deletion(self):
        """Test that deleting a patient cascades and deletes related predictions."""
        patient = Patient(age=50, gender="male")
        predictions = {
            "diabetes": PredictionResult(
                disease="Diabetes", prediction=1, probability=0.9
            )
        }
        patient_id = save_patient_with_predictions(patient, predictions)

        # Verify prediction exists
        preds = get_predictions_for_patient(patient_id)
        self.assertEqual(len(preds), 1)

        # Delete patient
        deleted = delete_patient(patient_id)
        self.assertTrue(deleted)

        # Verify predictions were also removed by CASCADE
        preds_after = get_predictions_for_patient(patient_id)
        self.assertEqual(len(preds_after), 0)

    def test_aggregation_stats(self):
        """Test SQL aggregation (GROUP BY, COUNT, SUM, AVG)."""
        p1 = Patient(age=40, gender="male")
        p2 = Patient(age=55, gender="female")

        save_patient_with_predictions(
            p1,
            {
                "diabetes": PredictionResult(disease="Diabetes", prediction=1, probability=0.8),
                "liver": PredictionResult(disease="Liver Disease", prediction=0, probability=0.2),
            },
        )
        save_patient_with_predictions(
            p2,
            {
                "diabetes": PredictionResult(disease="Diabetes", prediction=0, probability=0.4),
                "liver": PredictionResult(disease="Liver Disease", prediction=0, probability=0.1),
            },
        )

        stats = get_prediction_stats()
        self.assertEqual(len(stats), 2)
        diabetes_stat = next(s for s in stats if s["disease"] == "Diabetes")
        self.assertEqual(diabetes_stat["total"], 2)
        self.assertEqual(diabetes_stat["positive"], 1)
        self.assertAlmostEqual(diabetes_stat["avg_probability"], 0.60, places=2)

    def test_concurrent_writes_thread_safety(self):
        """Test concurrent multi-threaded writes without race conditions or database locks."""
        num_threads = 10
        errors = []

        def worker(thread_idx):
            try:
                patient = Patient(age=20 + thread_idx, gender="female")
                preds = {
                    "diabetes": PredictionResult(
                        disease="Diabetes", prediction=0, probability=0.1
                    )
                }
                save_patient_with_predictions(patient, preds)
                log_request(
                    endpoint="/test",
                    method="POST",
                    status_code=200,
                    processing_time_ms=12.5,
                    worker_thread=threading.current_thread().name,
                    process_id=os.getpid(),
                )
            except Exception as e:
                errors.append(e)

        threads = [
            threading.Thread(target=worker, args=(i,), name=f"writer-thread-{i}")
            for i in range(num_threads)
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(len(errors), 0, f"Concurrent write errors encountered: {errors}")
        patients = get_all_patients(limit=100)
        self.assertEqual(len(patients), num_threads)
        logs = get_recent_logs(limit=100)
        self.assertEqual(len(logs), num_threads)


if __name__ == "__main__":
    unittest.main()
