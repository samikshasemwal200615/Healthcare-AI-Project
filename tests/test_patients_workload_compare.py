"""Integration tests for Patients, Workload Manager, Compare, and Database Overview routes."""

import unittest
from fastapi.testclient import TestClient
from app.main import app


class TestExtendedRoutes(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_patients_list(self):
        res = self.client.get("/patients/")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("patients", data)
        self.assertIn("total", data)
        self.assertGreater(data["total"], 0)

    def test_patient_detail(self):
        res = self.client.get("/patients/")
        self.assertEqual(res.status_code, 200)
        patient_id = res.json()["patients"][0]["id"]

        detail_res = self.client.get(f"/patients/{patient_id}")
        self.assertEqual(detail_res.status_code, 200)
        detail = detail_res.json()
        self.assertIn("patient", detail)
        self.assertIn("reports", detail)

    def test_workload_stats(self):
        res = self.client.get("/jobs/stats")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("active_jobs", data)
        self.assertIn("queued_jobs", data)
        self.assertIn("available_slots", data)
        self.assertIn("workers", data)
        self.assertEqual(len(data["workers"]), 2)

    def test_database_overview(self):
        res = self.client.get("/database/overview")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["engine"], "SQLITE")
        self.assertEqual(data["status"], "Connected")
        self.assertIn("stats", data)
        self.assertIn("recent_records", data)

    def test_compare_reports(self):
        # Fetch available reports
        rep_res = self.client.get("/compare/reports")
        self.assertEqual(rep_res.status_code, 200)
        reports = rep_res.json()["reports"]
        if len(reports) >= 2:
            r_a = reports[0]["id"]
            r_b = reports[1]["id"]
            cmp_res = self.client.get(f"/compare/?report_a={r_a}&report_b={r_b}")
            self.assertEqual(cmp_res.status_code, 200)
            cmp_data = cmp_res.json()
            self.assertIn("disease_trajectories", cmp_data)
            self.assertIn("parameters_comparison", cmp_data)


if __name__ == "__main__":
    unittest.main()
