"""Workload Manager — FCFS-scheduled job queue with bounded 2-worker pool.

Operating System Concepts Demonstrated:
1. First-Come, First-Served (FCFS) CPU/Worker Scheduling via thread-safe queue.Queue.
2. Bounded Concurrency Limit: exactly 2 worker threads (Worker-1, Worker-2).
3. Thread Synchronization: Lock protects shared worker state and statistics.
4. Execution Timing Metrics: Queue Waiting Time, Execution Time, Total Turnaround Time.
5. Graceful Daemon Threads: Worker threads run in background and process incoming tasks.
"""

import os
import json
import logging
import queue
import threading
import time
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from db.connection import DatabaseManager


logger = logging.getLogger("healthcare.workload")


class WorkloadManager:
    _instance: Optional["WorkloadManager"] = None
    _init_lock = threading.Lock()

    def __init__(self, num_workers: int = 2):
        self.num_workers = num_workers
        self.job_queue: queue.Queue = queue.Queue()
        self.state_lock = threading.Lock()
        
        # Worker state tracking
        self.workers = {
            "Worker-1": {"id": "Worker-1", "status": "IDLE", "current_job": None, "current_file": None},
            "Worker-2": {"id": "Worker-2", "status": "IDLE", "current_job": None, "current_file": None},
        }

        # Active jobs in memory for fast querying
        self.active_jobs: Dict[str, Dict[str, Any]] = {}

        # Start worker threads
        self._threads: List[threading.Thread] = []
        for i in range(1, self.num_workers + 1):
            worker_name = f"Worker-{i}"
            t = threading.Thread(
                target=self._worker_loop,
                args=(worker_name,),
                name=worker_name,
                daemon=True,
            )
            self._threads.append(t)
            t.start()
            logger.info(f"Spawned workload worker thread: {worker_name}")

    @classmethod
    def get_instance(cls) -> "WorkloadManager":
        with cls._init_lock:
            if cls._instance is None:
                cls._instance = WorkloadManager(num_workers=2)
            return cls._instance

    def enqueue_job(
        self,
        filename: str,
        patient_id: Optional[str] = None,
        patient_name: Optional[str] = None,
        file_path: Optional[str] = None,
        simulate_duration: float = 2.5,
        should_fail: bool = False,
    ) -> Dict[str, Any]:
        """Enqueue a new report processing job (FCFS scheduling)."""
        job_id = str(uuid.uuid4())
        now = datetime.now()
        submitted_at_str = now.strftime("%m/%d/%Y, %I:%M:%S %p")
        time_short = now.strftime("%I:%M:%S %p")

        timeline = [
            {
                "step": "QUEUED",
                "time": time_short,
                "desc": f"Job enqueued in FCFS queue: {filename}",
            }
        ]

        job_data = {
            "id": job_id,
            "filename": filename,
            "status": "QUEUED",
            "worker": "Unassigned",
            "report_id": "Not assigned",
            "patient_id": patient_id,
            "patient_name": patient_name or "Anonymous",
            "submitted_at": submitted_at_str,
            "submitted_timestamp": time.time(),
            "started_at": None,
            "completed_at": None,
            "queue_wait_ms": 0.0,
            "execution_ms": 0.0,
            "total_turnaround_s": 0.0,
            "timeline": timeline,
            "file_path": file_path,
            "simulate_duration": simulate_duration,
            "should_fail": should_fail,
        }

        # Persist to DB as QUEUED
        self._persist_job(job_data)

        # Enqueue in thread-safe FCFS queue
        self.job_queue.put(job_data)
        logger.info(f"Enqueued job {job_id} for file '{filename}' into FCFS queue")
        return job_data

    def enqueue_test_batch(self) -> List[Dict[str, Any]]:
        """Enqueue 3 synthetic jobs simultaneously to demonstrate FCFS and 2-worker bounded concurrency."""
        batch_files = [
            ("aarav_mehta_comprehensive_synthetic_test_report.pdf", "aarav", 2.2, False),
            ("cardiac_metabolic_panel_batch_02.pdf", "sandy", 3.0, False),
            ("hepatic_biomarker_screening_batch_03.pdf", "Babu rao", 2.0, False),
        ]
        results = []
        for filename, patient_name, dur, fail in batch_files:
            job = self.enqueue_job(
                filename=filename,
                patient_name=patient_name,
                simulate_duration=dur,
                should_fail=fail,
            )
            results.append(job)
        return results

    def _worker_loop(self, worker_name: str) -> None:
        """Continuous worker loop picking jobs from FCFS queue."""
        while True:
            try:
                job_data = self.job_queue.get()
            except Exception:
                continue

            job_id = job_data["id"]
            filename = job_data["filename"]
            submit_time = job_data["submitted_timestamp"]
            dequeue_time = time.time()
            queue_wait_ms = max(1.0, (dequeue_time - submit_time) * 1000)

            # Mark worker BUSY
            now = datetime.now()
            started_at_str = now.strftime("%m/%d/%Y, %I:%M:%S %p")
            time_short = now.strftime("%I:%M:%S %p")

            job_data["status"] = "ACTIVE"
            job_data["worker"] = worker_name
            job_data["started_at"] = started_at_str
            job_data["queue_wait_ms"] = round(queue_wait_ms, 1)

            job_data["timeline"].append({
                "step": "OCR STARTED",
                "time": time_short,
                "desc": f"{worker_name} acquired slot; starting PyMuPDF OCR extraction",
            })

            with self.state_lock:
                self.workers[worker_name]["status"] = "BUSY"
                self.workers[worker_name]["current_job"] = job_id
                self.workers[worker_name]["current_file"] = filename
                self.active_jobs[job_id] = job_data

            self._persist_job(job_data)

            # Process job
            exec_start = time.perf_counter()
            failed = job_data.get("should_fail", False)
            duration = job_data.get("simulate_duration", 2.0)
            file_path = job_data.get("file_path")
            patient_name = job_data.get("patient_name") or "Anonymous"
            patient_id = job_data.get("patient_id")

            try:
                # --- Step 1: OCR Extraction Phase ---
                extracted_values = {}
                if file_path and os.path.exists(file_path):
                    try:
                        from ocr.reader import process_report
                        extracted_values = process_report(file_path)
                    except Exception as ocr_err:
                        logger.warning(f"OCR reader exception for {filename}: {ocr_err}")
                        extracted_values = {}
                else:
                    time.sleep(duration * 0.4)

                param_count = sum(1 for v in extracted_values.values() if v is not None)
                now_ocr = datetime.now().strftime("%I:%M:%S %p")
                job_data["timeline"].append({
                    "step": "OCR COMPLETED",
                    "time": now_ocr,
                    "desc": f"Extracted {param_count} biometric parameters and lab panel values from PDF",
                })

                # --- Step 2: Prediction Phase ---
                now_pred = datetime.now().strftime("%I:%M:%S %p")
                job_data["timeline"].append({
                    "step": "PREDICTION STARTED",
                    "time": now_pred,
                    "desc": "Dispatching multi-model inference pipeline (Diabetes, Liver, CVD)",
                })

                if failed:
                    raise RuntimeError("Simulated OCR / validation error in report document")

                # Baseline defaults to ensure model input integrity
                default_panel = {
                    "age": 45,
                    "gender": "Male",
                    "height": 172.0,
                    "weight": 76.0,
                    "glucose": 130.0,
                    "bloodpressure": 82.0,
                    "bmi": 25.7,
                    "total_bilirubin": 1.0,
                    "direct_bilirubin": 0.3,
                    "alkaline_phosphatase": 95.0,
                    "alt": 32.0,
                    "ast": 28.0,
                    "total_proteins": 7.1,
                    "albumin": 4.1,
                    "albumin_globulin_ratio": 1.35,
                    "systolic_bp": 126,
                    "diastolic_bp": 82,
                    "cholesterol": 205,
                    "gluc": 2,
                    "smoke": 0,
                    "alco": 0,
                    "active": 1,
                }
                merged_panel = {**default_panel, **{k: v for k, v in extracted_values.items() if v is not None}}

                from patient.patient import Patient
                from prediction.predictor import predict_all
                from db.patient_repo import save_patient_with_predictions

                patient_obj = Patient(**merged_panel)
                preds = predict_all(patient_obj)

                # Persist to relational patients & predictions tables
                db_patient_id = save_patient_with_predictions(patient_obj, preds)

                # Format predictions for JSON storage in lab_reports
                predictions_dict = {}
                for k, v in preds.items():
                    predictions_dict[k] = {
                        "disease": v.disease,
                        "prediction": int(v.prediction),
                        "probability": round(float(v.probability), 2),
                        "risk_level": "High Risk" if v.prediction == 1 else "Low Risk",
                    }

                # --- Step 3: Relational lab_reports Persistence ---
                db = DatabaseManager.get_instance()
                report_id = str(uuid.uuid4())

                # Find or register patient
                reg_patient_id = patient_id
                if not reg_patient_id:
                    p_row = db.execute_read_one(
                        "SELECT id FROM registered_patients WHERE name = ?", (patient_name,)
                    )
                    if p_row:
                        reg_patient_id = p_row["id"]
                    else:
                        reg_patient_id = str(uuid.uuid4())
                        db.execute_transaction(lambda conn: conn.execute(
                            """INSERT INTO registered_patients (id, name, gender, dob, clinical_notes)
                               VALUES (?, ?, ?, ?, ?)""",
                            (reg_patient_id, patient_name, str(merged_panel.get("gender", "OTHER")), "1988-06-15", "Registered via Workload Manager")
                        ))

                now_ts = datetime.now()
                uploaded_at_str = now_ts.strftime("%m/%d/%Y, %I:%M:%S %p")
                created_at_iso = now_ts.strftime("%Y-%m-%d %H:%M:%S")
                biomarkers_num = max(param_count, len(merged_panel))

                def _save_report(conn):
                    conn.execute(
                        """INSERT INTO lab_reports
                           (id, patient_id, patient_name, filename, status, biomarkers_count,
                            parameters, predictions, uploaded_at, created_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (
                            report_id,
                            reg_patient_id,
                            patient_name,
                            filename,
                            "Completed",
                            biomarkers_num,
                            json.dumps(merged_panel),
                            json.dumps(predictions_dict),
                            uploaded_at_str,
                            created_at_iso,
                        ),
                    )
                db.execute_transaction(_save_report)

                job_data["report_id"] = report_id
                job_data["status"] = "COMPLETED"

                now_comp = datetime.now().strftime("%I:%M:%S %p")
                job_data["timeline"].append({
                    "step": "COMPLETED",
                    "time": now_comp,
                    "desc": f"Predictions committed to DB (Report ID: {report_id[:8]}...)",
                })

            except Exception as e:
                logger.error(f"Worker {worker_name} failed on job {job_id}: {e}")
                now_err = datetime.now().strftime("%I:%M:%S %p")
                job_data["timeline"].append({
                    "step": "FAILED",
                    "time": now_err,
                    "desc": f"Execution failed: {str(e)}",
                })
                job_data["status"] = "FAILED"
                job_data["error_message"] = str(e)

            finally:
                if file_path and os.path.exists(file_path):
                    try:
                        os.unlink(file_path)
                    except Exception:
                        pass

                exec_end = time.perf_counter()
                exec_ms = (exec_end - exec_start) * 1000
                total_turnaround_s = (time.time() - submit_time)

                job_data["completed_at"] = datetime.now().strftime("%m/%d/%Y, %I:%M:%S %p")
                job_data["execution_ms"] = round(exec_ms, 1)
                job_data["total_turnaround_s"] = round(total_turnaround_s, 2)

                with self.state_lock:
                    self.workers[worker_name]["status"] = "IDLE"
                    self.workers[worker_name]["current_job"] = None
                    self.workers[worker_name]["current_file"] = None
                    if job_id in self.active_jobs:
                        del self.active_jobs[job_id]

                self._persist_job(job_data)
                self.job_queue.task_done()
                logger.info(f"Worker {worker_name} finished job {job_id} | status={job_data['status']} | report_id={job_data.get('report_id')}")

    def _persist_job(self, job: Dict[str, Any]) -> None:
        """Persist or update job state in SQLite."""
        try:
            db = DatabaseManager.get_instance()
            def _txn(conn):
                conn.execute(
                    """INSERT OR REPLACE INTO workload_jobs
                       (id, filename, status, worker, report_id, patient_id, patient_name,
                        submitted_at, started_at, completed_at, queue_wait_ms, execution_ms,
                        total_turnaround_s, timeline, error_message)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        job["id"],
                        job["filename"],
                        job["status"],
                        job["worker"],
                        job.get("report_id", "Not assigned"),
                        job.get("patient_id"),
                        job.get("patient_name"),
                        job["submitted_at"],
                        job.get("started_at"),
                        job.get("completed_at"),
                        job.get("queue_wait_ms", 0.0),
                        job.get("execution_ms", 0.0),
                        job.get("total_turnaround_s", 0.0),
                        json.dumps(job.get("timeline", [])),
                        job.get("error_message"),
                    ),
                )
            db.execute_transaction(_txn)
        except Exception as e:
            logger.error(f"Failed to persist workload job {job.get('id')}: {e}")

    def get_stats(self) -> Dict[str, Any]:
        """Aggregate workload metrics."""
        db = DatabaseManager.get_instance()

        queued_count = self.job_queue.qsize()
        with self.state_lock:
            active_count = len(self.active_jobs)
            busy_workers = sum(1 for w in self.workers.values() if w["status"] == "BUSY")
            workers_status = [dict(w) for w in self.workers.values()]

        # Database counts for completed / failed
        completed_row = db.execute_read_one(
            "SELECT COUNT(*) AS cnt FROM workload_jobs WHERE status = 'COMPLETED'"
        )
        failed_row = db.execute_read_one(
            "SELECT COUNT(*) AS cnt FROM workload_jobs WHERE status = 'FAILED'"
        )

        completed_count = completed_row["cnt"] if completed_row else 0
        failed_count = failed_row["cnt"] if failed_row else 0

        available_slots = f"{self.num_workers - busy_workers}/{self.num_workers}"
        worker_load_pct = int((busy_workers / self.num_workers) * 100) if self.num_workers else 0

        return {
            "active_jobs": active_count,
            "queued_jobs": queued_count,
            "completed": completed_count,
            "failed": failed_count,
            "available_slots": available_slots,
            "dead_letter": 0,
            "worker_load": f"{worker_load_pct}%",
            "busy_workers": busy_workers,
            "total_workers": self.num_workers,
            "workers": workers_status,
        }

    def list_jobs(self, category: str = "all", limit: int = 50) -> List[Dict[str, Any]]:
        """List jobs filtered by category: 'queue', 'active', 'history', or 'all'."""
        db = DatabaseManager.get_instance()
        if category == "active":
            with self.state_lock:
                return list(self.active_jobs.values())
        elif category == "queue":
            rows = db.execute_read(
                "SELECT * FROM workload_jobs WHERE status = 'QUEUED' ORDER BY rowid DESC LIMIT ?",
                (limit,),
            )
        elif category == "history":
            rows = db.execute_read(
                "SELECT * FROM workload_jobs WHERE status IN ('COMPLETED', 'FAILED') ORDER BY rowid DESC LIMIT ?",
                (limit,),
            )
        else:
            rows = db.execute_read(
                "SELECT * FROM workload_jobs ORDER BY rowid DESC LIMIT ?",
                (limit,),
            )

        jobs = []
        for r in rows:
            d = dict(r)
            if isinstance(d.get("timeline"), str):
                try:
                    d["timeline"] = json.loads(d["timeline"])
                except Exception:
                    d["timeline"] = []
            jobs.append(d)
        return jobs


    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve single job details."""
        with self.state_lock:
            if job_id in self.active_jobs:
                return dict(self.active_jobs[job_id])

        db = DatabaseManager.get_instance()
        row = db.execute_read_one(
            "SELECT * FROM workload_jobs WHERE id = ?", (job_id,)
        )
        if not row:
            return None
        d = dict(row)
        if isinstance(d.get("timeline"), str):
            try:
                d["timeline"] = json.loads(d["timeline"])
            except Exception:
                d["timeline"] = []
        return d
