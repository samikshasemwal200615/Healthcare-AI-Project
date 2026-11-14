"""Tests for concurrent disease prediction orchestrator.

Demonstrates OS concepts:
- ThreadPoolExecutor parallel execution
- Thread safety under concurrent invocations
- Thread naming and identification
- Preservation of prediction correctness
"""

import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor

from patient.patient import Patient
from prediction.predictor import predict_all


class TestConcurrentPredictions(unittest.TestCase):
    def setUp(self):
        # A sample patient with valid values across all diseases
        self.patient = Patient(
            age=50,
            gender="male",
            height=170.0,
            weight=75.0,
            pregnancies=0,
            glucose=120.0,
            bloodpressure=80.0,
            skinthickness=20.0,
            insulin=85.0,
            bmi=26.0,
            diabetespedigreefunction=0.5,
            total_bilirubin=1.0,
            direct_bilirubin=0.3,
            alkaline_phosphatase=180.0,
            alt=30.0,
            ast=35.0,
            total_proteins=6.8,
            albumin=3.5,
            albumin_globulin_ratio=1.0,
            systolic_bp=120,
            diastolic_bp=80,
            cholesterol=1,
            gluc=1,
            smoke=False,
            alco=False,
            active=True,
        )

    def test_predict_all_returns_all_three_diseases(self):
        """predict_all returns results for diabetes, liver, and cardiovascular."""
        results = predict_all(self.patient)

        self.assertIn("diabetes", results)
        self.assertIn("liver", results)
        self.assertIn("cardiovascular", results)

        for disease_key, res in results.items():
            self.assertIn(res.prediction, (0, 1))
            self.assertGreaterEqual(res.probability, 0.0)
            self.assertLessEqual(res.probability, 1.0)
            self.assertIsInstance(res.disease, str)

    def test_concurrent_multiple_requests(self):
        """Simulate 5 simultaneous users requesting predictions concurrently."""
        num_requests = 5
        results_list = []
        errors = []

        def worker(req_id):
            try:
                # Slightly varied patient age
                p = self.patient.model_copy()
                p.age = 40 + req_id
                res = predict_all(p)
                results_list.append(res)
            except Exception as e:
                errors.append(e)

        with ThreadPoolExecutor(max_workers=5) as user_pool:
            futures = [user_pool.submit(worker, i) for i in range(num_requests)]
            for f in futures:
                f.result()

        self.assertEqual(len(errors), 0, f"Concurrent prediction errors: {errors}")
        self.assertEqual(len(results_list), num_requests)
        for res in results_list:
            self.assertEqual(len(res), 3)


if __name__ == "__main__":
    unittest.main()
