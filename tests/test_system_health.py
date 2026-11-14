"""Tests for OS-level system monitoring endpoint (/system/health).

Demonstrates:
- Verification of psutil metrics (CPU, memory, PID)
- Thread enumeration and verification
- System-wide resource monitoring reporting
"""

import os
import unittest
from fastapi.testclient import TestClient

from app.main import app


class TestSystemHealth(unittest.TestCase):
    def setUp(self):
        self.client_ctx = TestClient(app)
        self.client = self.client_ctx.__enter__()

    def tearDown(self):
        self.client_ctx.__exit__(None, None, None)

    def test_root_endpoint(self):
        """Root endpoint returns expected message."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("message", response.json())

    def test_system_health_endpoint(self):
        """System health endpoint returns valid process, thread, and system metrics."""
        response = self.client.get("/system/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["status"], "healthy")

        # Process metrics (OS: Process control)
        proc = data["process"]
        self.assertEqual(proc["pid"], os.getpid())
        self.assertGreater(proc["memory_rss_mb"], 0)
        self.assertGreaterEqual(proc["num_threads"], 1)

        # Thread metrics (OS: Thread management)
        threads = data["threads"]
        self.assertGreater(threads["active_count"], 0)
        self.assertIsInstance(threads["names"], list)
        self.assertGreaterEqual(len(threads["names"]), 1)

        # System metrics (OS: Hardware/resource metrics)
        sys_info = data["system"]
        self.assertGreater(sys_info["cpu_count"], 0)
        self.assertGreater(sys_info["total_memory_mb"], 0)
        self.assertGreaterEqual(sys_info["memory_used_percent"], 0.0)


if __name__ == "__main__":
    unittest.main()
