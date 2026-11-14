# Healthcare AI — Clinical Decision Support System

An end-to-end intelligent healthcare decision-support system that combines Machine Learning, Operating System concurrency principles, and Database Management Systems (DBMS) architecture.

The application ingests diagnostic PDF lab reports, extracts biochemical markers via regex-based OCR, dynamically queries for missing indicators, and performs parallel machine learning inference to predict the likelihood of **Diabetes**, **Liver Disease**, and **Cardiovascular Disease**.

---

## Architecture Overview

```
                                      ┌────────────────────────────────┐
                                      │   User (Web / HTTP Client)     │
                                      └───────────────┬────────────────┘
                                                      │
                                    PDF Upload / Questionnaire Answers
                                                      │
                                                      ▼
                                       FastAPI Backend (app/main.py)
                                                      │
                       ┌──────────────────────────────┴──────────────────────────────┐
                       ▼                                                             ▼
            Operating System Concepts                                     DBMS Integration
     ───────────────────────────────────────                       ───────────────────────────────
     • ThreadPoolExecutor concurrency                              • SQLite Engine with WAL mode
     • GIL release & shared memory models                          • ACID Transactions (Atomicity)
     • Mutex Lock (threading.Lock) for writes                      • Relational Schema (3NF)
     • Thread-Local Storage (threading.local)                      • Foreign Key Cascades & Indexes
     • Process & Resource Monitoring (psutil)                      • SQL Aggregations & Analytical JOINs
     • Context Managers & TempFile isolation                       • Audit Trail with OS Telemetry
```

---

## Key Features & Academic Concept Integration

### 1. Operating System (OS) Concepts

- **Multithreading & Concurrency ([`prediction/predictor.py`](file:///d:/Healthcare_AI%20-%20Copy/prediction/predictor.py)):**
  Replaces sequential model inference with a bounded `ThreadPoolExecutor(max_workers=3)`. Each disease model prediction runs concurrently on a dedicated worker thread (`predictor_0`, `predictor_1`, `predictor_2`).
- **Memory Efficiency & GIL Exploitation:**
  The pre-trained models (~20 MB total) reside in shared virtual memory. Scikit-learn's underlying C/Cython algorithms release Python's Global Interpreter Lock (GIL) during inference, achieving true parallel computation without duplicating process memory.
- **Synchronization Primitives ([`db/connection.py`](file:///d:/Healthcare_AI%20-%20Copy/db/connection.py)):**
  Uses `threading.Lock()` as a mutex around write transactions to serialize database modifications and prevent SQLite lock contention.
- **Thread-Local Storage (TLS):**
  Uses `threading.local()` to maintain isolated SQLite connection instances per thread, ensuring thread safety without cross-thread connection leaking.
- **Process & Resource Monitoring ([`app/routes/system.py`](file:///d:/Healthcare_AI%20-%20Copy/app/routes/system.py)):**
  Real-time endpoint returning live host and process telemetry via `psutil` (PID, CPU usage %, RSS memory, active threads enumeration).
- **Safe Resource Cleanup:**
  PyMuPDF document handles and temporary upload files use Python context managers (`with` blocks) and `tempfile.NamedTemporaryFile` with guaranteed file deletion in `finally` blocks.
- **Process Lifespan Management ([`app/main.py`](file:///d:/Healthcare_AI%20-%20Copy/app/main.py)):**
  FastAPI `lifespan` handler coordinates orderly startup (schema verification, connection pool preparation) and graceful shutdown (connection drainage).

---

### 2. Database Management System (DBMS) Concepts

- **Relational Schema ([`db/schema.sql`](file:///d:/Healthcare_AI%20-%20Copy/db/schema.sql)):**
  Normalized tables (`patients`, `predictions`, `audit_log`) in Third Normal Form (3NF).
- **ACID Transaction Atomicity ([`db/patient_repo.py`](file:///d:/Healthcare_AI%20-%20Copy/db/patient_repo.py)):**
  Patient data and prediction outputs are committed as a single unit of work (`execute_transaction`). If any operation fails, the transaction is rolled back completely.
- **Consistency Enforcement:**
  Schema-level `CHECK` constraints (e.g., `age > 0`, `glucose >= 0`, `bmi >= 0`) and `NOT NULL` guarantees data validity at the database engine layer.
- **Isolation via WAL Mode:**
  SQLite configured with `PRAGMA journal_mode=WAL` (Write-Ahead Logging), allowing concurrent readers while writes are staged and committed without read locking.
- **Referential Integrity & Cascading:**
  `FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE` ensures child records in `predictions` are automatically purged when a parent patient record is removed.
- **Indexing & Performance:**
  B-Tree secondary indexes on frequently filtered fields (`idx_predictions_patient`, `idx_predictions_disease`, `idx_audit_log_endpoint`, `idx_patients_created`).
- **SQL Analytics & Aggregations ([`db/prediction_repo.py`](file:///d:/Healthcare_AI%20-%20Copy/db/prediction_repo.py)):**
  Statistical queries using `GROUP BY`, `COUNT(*)`, `SUM()`, `AVG()` and multi-table relational `JOIN` queries.

---

## Project Structure

```
Healthcare_AI/
├── app/
│   ├── config.py                # Environment configuration
│   ├── logging_config.py        # Centralized structured logging
│   ├── main.py                  # FastAPI application entry point with lifespan
│   ├── middleware/
│   │   └── audit.py             # Request timing, thread name, & audit middleware
│   ├── routes/
│   │   ├── prediction.py        # Lab upload & prediction endpoints (with persistence)
│   │   ├── history.py           # Patient history, query by ID, stats, and audit logs
│   │   └── system.py            # OS resource & health monitoring
│   └── schemas/                 # Pydantic request/response validation schemas
├── db/
│   ├── connection.py            # Thread-safe DatabaseManager (Lock, TLS, WAL)
│   ├── schema.sql               # Relational DDL (Tables, CHECKs, FKs, Indexes)
│   ├── init_db.py               # Idempotent database schema bootstrapper
│   ├── patient_repo.py          # CRUD & atomic transaction persistence
│   ├── prediction_repo.py       # Prediction queries, JOINs, and GROUP BY aggregations
│   └── audit_repo.py            # Audit log recorder
├── ocr/                         # PDF text extraction & regex lab aliases
├── patient/                     # Patient model, sanity validator, & merger
├── prediction/                  # Pretrained ML predictors & ThreadPoolExecutor
├── tests/
│   ├── test_database.py         # ACID, constraints, cascade, concurrency tests
│   ├── test_concurrent_predictions.py  # ThreadPoolExecutor parallel execution tests
│   ├── test_system_health.py    # OS process & thread monitoring endpoint tests
│   └── test_api_integration.py  # End-to-end API integration tests
├── docs/
│   └── viva_guide.md            # Detailed viva examination Q&A and concept guide
├── models/                      # Pre-trained scikit-learn models & scalers
└── requirements.txt             # Python dependencies
```

---

## API Endpoints

### Prediction Routes
- `POST /predict/` — Upload a PDF lab report, trigger OCR extraction, and receive either missing-field questionnaire or concurrent predictions.
- `POST /predict/continue` — Submit answers to missing questionnaire fields, execute concurrent predictions, and atomically persist patient and results.

### Historical Records & Analytics
- `GET /history/patients` — List stored patient submissions with pagination.
- `GET /history/patients/{id}` — Retrieve complete patient history joined with predictions.
- `DELETE /history/patients/{id}` — Remove patient record (triggers FK `ON DELETE CASCADE` on predictions).
- `GET /history/stats` — Aggregate metrics grouped by disease (total tests, positive count, average probability).
- `GET /history/audit` — View chronological audit logs with worker thread, PID, and response time.

### Patient Registry & Reports
- `GET /patients/` — List all registered demographic patients with report counts.
- `POST /patients/` — Register new patient demographic record.
- `GET /patients/{id}` — Patient profile with all historical medical reports.
- `POST /patients/{id}/upload` — Upload and analyze report linked to patient.
- `DELETE /patients/{id}` — Delete patient and cascade delete all linked reports.

### Workload Manager & FCFS Scheduling
- `GET /jobs/stats` — Real-time metrics: active, queued, completed, failed, available slots, worker load.
- `GET /jobs/?category=` — List queue, active, and history jobs.
- `GET /jobs/{id}` — Detailed job execution timings and step-by-step processing timeline.
- `POST /jobs/enqueue-test-batch` — Enqueues 3 test jobs simultaneously to demonstrate FCFS scheduling and bounded 2-worker pool.
- `POST /jobs/upload` — Enqueue report upload in FCFS processing queue.

### Compare Reports & Longitudinal Analytics
- `GET /compare/reports` — List available reports for comparison.
- `GET /compare/?report_a={id}&report_b={id}` — Returns side-by-side parameter delta table and AI disease risk trajectory scores.

### Database Overview
- `GET /database/overview` — DBMS connection status, WAL mode verification, aggregate statistics, and recent database records.

### System & Health Telemetry
- `GET /` — Service health probe.
- `GET /system/health` — Live OS metrics (Process PID, CPU %, RSS memory, active OS thread count and names, host memory).

---

## Frontend Web Application (React + Vite + Tailwind CSS)

The application includes a comprehensive clinical intelligence frontend at `http://localhost:5173`:
1. **Home:** Overview and direct module navigation.
2. **Upload Report:** Ingests lab reports (PDF/images) with dynamic questionnaires.
3. **Patients & History:** Demographic patient registry, search, report history, and comparison selector.
4. **Compare Reports:** Side-by-side biometric parameter deltas and Disease Risk Probability Trajectories.
5. **Workload Manager:** Live FCFS job queue, 2-worker bounded pool (`Worker-1`, `Worker-2`), execution timings, and processing timelines.
6. **Database Overview:** SQLite connectivity, aggregate statistics, and recent database records.
7. **System Monitor:** Real-time host CPU, process RSS memory, active thread enumeration, and request audit trail.

---

## Quickstart Guide

### 1. Environment Setup
```powershell
# Navigate to project directory
cd "d:\Healthcare_AI - Copy"

# Verify virtual environment
& ".\.venv\Scripts\python.exe" --version
```

### 2. Run the Full Test Suite
Execute the comprehensive test suite (17 tests) verifying OS concurrency, DBMS ACID compliance, and API routes:
```powershell
& ".\.venv\Scripts\python.exe" -m unittest discover -s tests -p "test_*.py"
```

### 3. Start the Application
- **Backend API Server:**
  ```powershell
  & ".\.venv\Scripts\python.exe" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
  ```
- **Frontend Client:**
  ```powershell
  cd frontend
  npm run dev
  ```
Open `http://localhost:5173` in your browser.

Interactive API documentation is available at:
- **Swagger UI:** `http://127.0.0.1:8000/docs`
- **ReDoc:** `http://127.0.0.1:8000/redoc`

---

## Viva & Technical Evaluation Reference

For in-depth explanations, code line references, and sample examiner questions and answers, refer to:
**[`docs/viva_guide.md`](file:///d:/Healthcare_AI%20-%20Copy/docs/viva_guide.md)**.

