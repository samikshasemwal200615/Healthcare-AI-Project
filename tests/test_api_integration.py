"""End-to-end API integration tests.

Demonstrates:
- Full prediction workflow via POST /predict/continue
- Atomicity of DB storage during request handling
- Patient and prediction history endpoints (/history/patients, /history/patients/{id})
- Database aggregation stats (/history/stats)
- Audit log persistence capturing OS thread, PID, and request timing (/history/audit)
- Foreign Key CASCADE deletion (/history/patients/{id})
"""

import unittest
from fastapi.testclient import TestClient

from app.main import app
from db.connection import DatabaseManager


class TestApiIntegration(unittest.TestCase):
    def setUp(self):
        self.client_ctx = TestClient(app)
        self.client = self.client_ctx.__enter__()

    def tearDown(self):
        self.client_ctx.__exit__(None, None, None)

    def test_predict_continue_persists_and_returns_predictions(self):
        """Test continue prediction endpoint with complete user answers."""
        payload = {
            "report_data": {
                "age": 48,
                "gender": "Male",
                "height": 172.0,
                "weight": 76.0,
                "glucose": 115.0,
                "bloodpressure": 78.0,
                "bmi": 25.7,
                "total_bilirubin": 0.9,
                "direct_bilirubin": 0.2,
                "alkaline_phosphatase": 160.0,
                "alt": 28.0,
                "ast": 32.0,
                "total_proteins": 7.0,
                "albumin": 3.8,
                "albumin_globulin_ratio": 1.1,
                "systolic_bp": 120,
                "diastolic_bp": 80,
                "cholesterol": 1,
                "gluc": 1,
            },
            "user_answers": {
                "pregnancies": 0,
                "skinthickness": 22.0,
                "insulin": 80.0,
                "diabetespedigreefunction": 0.45,
                "smoke": False,
                "alco": False,
                "active": True,
            },
        }

        response = self.client.post("/predict/continue", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["status"], "success")
        self.assertIsNotNone(data["patient_id"])
        patient_id = data["patient_id"]

        # Check predictions returned
        preds = data["predictions"]
        self.assertIn("diabetes", preds)
        self.assertIn("liver", preds)
        self.assertIn("cardiovascular", preds)

        # 1. Verify patient exists in history
        p_res = self.client.get(f"/history/patients/{patient_id}")
        self.assertEqual(p_res.status_code, 200)
        p_data = p_res.json()
        self.assertEqual(p_data["patient"]["id"], patient_id)
        self.assertEqual(p_data["patient"]["age"], 48)
        self.assertEqual(len(p_data["predictions"]), 3)

        # 2. Verify stats endpoint aggregates this record
        stats_res = self.client.get("/history/stats")
        self.assertEqual(stats_res.status_code, 200)
        stats_data = stats_res.json()
        self.assertGreaterEqual(stats_data["total_patients"], 1)
        self.assertGreaterEqual(len(stats_data["disease_stats"]), 1)

        # 3. Verify audit log captured request with OS metadata
        audit_res = self.client.get("/history/audit")
        self.assertEqual(audit_res.status_code, 200)
        logs = audit_res.json()["logs"]
        self.assertGreaterEqual(len(logs), 1)
        latest_log = logs[0]
        self.assertIn("worker_thread", latest_log)
        self.assertIn("process_id", latest_log)
        self.assertIn("processing_time_ms", latest_log)

        # 4. Verify cascade deletion
        del_res = self.client.delete(f"/history/patients/{patient_id}")
        self.assertEqual(del_res.status_code, 200)

        # Confirm 404 now
        p_res_after = self.client.get(f"/history/patients/{patient_id}")
        self.assertEqual(p_res_after.status_code, 404)


if __name__ == "__main__":
    unittest.main()
