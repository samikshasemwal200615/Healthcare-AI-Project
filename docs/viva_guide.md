# Healthcare AI — Comprehensive OS & DBMS Viva Examination Guide

This guide is prepared specifically for college viva examinations, project presentations, and technical evaluations. It details how **Operating Systems (OS)** and **Database Management Systems (DBMS)** concepts have been integrated into this Healthcare AI application, with direct links to source code files and line numbers.

---

## 1. Project Overview

**Healthcare AI** is an intelligent diagnostic decision-support system. Patients upload a lab report (PDF); the system extracts physiological and biochemical parameters using OCR and regular expressions, presents dynamic questionnaires for missing parameters, and feeds the validated data into pre-trained machine learning models to predict risk for **Diabetes**, **Liver Disease**, and **Cardiovascular Disease**.

### High-Level Architecture Flow

```
[ User Uploads Lab PDF / Answers Questionnaire ]
                        │
                        ▼
               FastAPI Backend (app/main.py)
                        │
      ┌─────────────────┴─────────────────┐
      ▼                                   ▼
 [ OS Concepts ]                     [ DBMS Concepts ]
 • ThreadPoolExecutor                • SQLite with WAL mode
 • Mutex Locks (threading.Lock)      • ACID Transactions (Atomicity)
 • Process Monitoring (psutil)       • Relational Schema (DDL/DML)
 • Resource Cleanup (Context Mgr)    • Foreign Key Cascades & Indexes
 • Thread-Local Storage              • Aggregation Queries (GROUP BY)
```

---

## 2. Operating System (OS) Concepts Demonstrated

| OS Concept | Where Implemented | Why & How It Works |
|---|---|---|
| **Multithreading & Concurrency** | [`prediction/predictor.py`](file:///d:/Healthcare_AI%20-%20Copy/prediction/predictor.py#L28-L79) | Parallelizes 3 independent ML model inferences across worker threads (`predictor_0`, `predictor_1`, `predictor_2`) using `concurrent.futures.ThreadPoolExecutor`. Reduces inference latency. |
| **GIL Release & Shared Memory** | [`prediction/predictor.py`](file:///d:/Healthcare_AI%20-%20Copy/prediction/predictor.py#L9-L14) | Models (~20MB total) reside in shared process memory. Scikit-learn's underlying C/Cython implementations release Python's Global Interpreter Lock (GIL) during inference, achieving true parallel CPU execution without duplicate process memory overhead. |
| **Mutual Exclusion (Mutex Locks)** | [`db/connection.py`](file:///d:/Healthcare_AI%20-%20Copy/db/connection.py#L36-L109) | `threading.Lock` serializes write transactions to prevent race conditions and "database is locked" errors during simultaneous write attempts. |
| **Thread-Local Storage (TLS)** | [`db/connection.py`](file:///d:/Healthcare_AI%20-%20Copy/db/connection.py#L37-L79) | Uses `threading.local()` to maintain separate SQLite connection objects per thread, avoiding cross-thread data corruption since SQLite connections are thread-affine. |
| **Process & Resource Monitoring** | [`app/routes/system.py`](file:///d:/Healthcare_AI%20-%20Copy/app/routes/system.py#L18-L50) | Uses `psutil` and `os.getpid()` to inspect real OS-level metrics: CPU utilization, Resident Set Size (RSS) memory, thread counts, and active thread identifiers. |
| **File Descriptors & Resource Management** | [`ocr/pdf_reader.py`](file:///d:/Healthcare_AI%20-%20Copy/ocr/pdf_reader.py#L11-L21) & [`app/routes/prediction.py`](file:///d:/Healthcare_AI%20-%20Copy/app/routes/prediction.py#L79-L140) | Uses Python context managers (`with` statements) and `tempfile.NamedTemporaryFile` with `finally: unlink()`. Guarantees file descriptor closure and eliminates temp file leaks and race conditions. |
| **Process Lifespan Management** | [`app/main.py`](file:///d:/Healthcare_AI%20-%20Copy/app/main.py#L31-L57) | FastAPI lifespan handler coordinates deterministic process startup (schema migration, pool initialization) and graceful shutdown (connection drainage, resource release). |
| **Request Auditing & Observability** | [`app/middleware/audit.py`](file:///d:/Healthcare_AI%20-%20Copy/app/middleware/audit.py#L24-L57) | Intercepts HTTP requests, measures execution time via high-resolution monotonic timer `time.perf_counter()`, captures the executing thread's name and PID, and records it to the database. |

---

## 3. Database Management System (DBMS) Concepts Demonstrated

| DBMS Concept | Where Implemented | Why & How It Works |
|---|---|---|
| **Relational Data Modeling (3NF)** | [`db/schema.sql`](file:///d:/Healthcare_AI%20-%20Copy/db/schema.sql) | Normalized tables: `patients` (parent entity), `predictions` (child entity), `audit_log` (independent observability log). |
| **ACID: Atomicity** | [`db/patient_repo.py`](file:///d:/Healthcare_AI%20-%20Copy/db/patient_repo.py#L27-L71) & [`db/connection.py`](file:///d:/Healthcare_AI%20-%20Copy/db/connection.py#L80-L109) | `execute_transaction()` wraps patient insertion and multiple prediction insertions inside `conn.commit()` / `conn.rollback()`. If one prediction fails, the patient row and previous predictions are rolled back completely. |
| **ACID: Consistency** | [`db/schema.sql`](file:///d:/Healthcare_AI%20-%20Copy/db/schema.sql#L33-L41) | Enforces schema constraints: `CHECK (age > 0)`, `CHECK (glucose >= 0)`, `CHECK (bmi >= 0)`, and `NOT NULL` columns. Invalid data is rejected at the database engine level. |
| **ACID: Isolation** | [`db/connection.py`](file:///d:/Healthcare_AI%20-%20Copy/db/connection.py#L72-L109) | Write operations are protected by a mutex lock, and SQLite runs with `PRAGMA journal_mode=WAL` (Write-Ahead Logging), allowing concurrent readers without blocking writes. |
| **ACID: Durability** | [`db/connection.py`](file:///d:/Healthcare_AI%20-%20Copy/db/connection.py#L102-L104) | Upon commit, WAL transactions are flushed to disk storage (`healthcare.db`). Server restarts retain all historical data. |
| **Referential Integrity & Cascading** | [`db/schema.sql`](file:///d:/Healthcare_AI%20-%20Copy/db/schema.sql#L54) & [`db/patient_repo.py`](file:///d:/Healthcare_AI%20-%20Copy/db/patient_repo.py#L92-L110) | `FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE` with `PRAGMA foreign_keys=ON`. Deleting a patient automatically deletes all associated predictions. |
| **Query Optimization (Indexing)** | [`db/schema.sql`](file:///d:/Healthcare_AI%20-%20Copy/db/schema.sql#L72-L76) | B-tree secondary indexes: `idx_predictions_patient`, `idx_predictions_disease`, `idx_audit_log_endpoint`, `idx_patients_created`. Transforms linear table scans ($O(N)$) into logarithmic lookups ($O(\log N)$). |
| **Aggregation & Analytics** | [`db/prediction_repo.py`](file:///d:/Healthcare_AI%20-%20Copy/db/prediction_repo.py#L20-L36) | Demonstrates SQL analytical capabilities: `GROUP BY disease`, `COUNT(*)`, `SUM(prediction)`, `AVG(probability)`. |
| **Relational JOIN Queries** | [`db/prediction_repo.py`](file:///d:/Healthcare_AI%20-%20Copy/db/prediction_repo.py#L38-L71) | `INNER JOIN` combining patient demographic data with disease risk predictions across primary/foreign keys in a single query. |

---

## 4. Viva Questions & Model Answers

### Q1: Why did you choose SQLite instead of MySQL or PostgreSQL for this project?
**Answer:**
> SQLite is a zero-configuration, serverless, self-contained relational database embedded directly in the application process. For an AI inference service where the models run on a single host or container, SQLite avoids the network round-trip overhead of client-server databases, eliminates external daemon dependencies, and—when configured with **Write-Ahead Logging (WAL)** mode—efficiently supports multiple concurrent readers alongside serial writes.

### Q2: What is Write-Ahead Logging (WAL) and why did you enable it?
**Answer:**
> By default, SQLite uses a rollback journal, which locks the entire database for both reads and writes during a transaction. With `PRAGMA journal_mode=WAL` (in [`db/connection.py`](file:///d:/Healthcare_AI%20-%20Copy/db/connection.py#L72)), changes are written to a separate `.db-wal` log file. This allows readers to continue reading from the original database file while a writer appends to the log, providing concurrent read access and preventing reader/writer contention.

### Q3: How do you handle concurrency in Python given the Global Interpreter Lock (GIL)?
**Answer:**
> We use a `ThreadPoolExecutor` with 3 worker threads in [`prediction/predictor.py`](file:///d:/Healthcare_AI%20-%20Copy/prediction/predictor.py). Although standard CPython bytecode execution is serialized by the GIL, numerical and scientific libraries like `scikit-learn` and `numpy` release the GIL during underlying C and Fortran linear algebra operations (e.g. tree traversals and matrix multiplications during `.predict()` and `.predict_proba()`). This allows true multicore parallel execution without the memory overhead of spawning separate processes.

### Q4: Why not use multiprocessing instead of multithreading for predictions?
**Answer:**
> The three trained machine learning models are loaded into memory on startup and occupy approximately 20MB of RAM. If we used multiprocessing, each worker process would require either pickling/unpickling data across IPC pipes or duplicating model weights into separate memory spaces. Multithreading allows all workers to safely share the read-only model objects in the same virtual address space, maximizing memory efficiency and minimizing process spawn latency.

### Q5: How is ACID Atomicity demonstrated in your code?
**Answer:**
> In [`db/patient_repo.py`](file:///d:/Healthcare_AI%20-%20Copy/db/patient_repo.py#L27-L71), when a prediction completes, `save_patient_with_predictions()` executes inside a single transaction. The patient record is inserted first, followed by the three prediction rows. If an error occurs during any insertion (tested in `test_acid_atomicity_rollback` in [`tests/test_database.py`](file:///d:/Healthcare_AI%20-%20Copy/tests/test_database.py)), `conn.rollback()` executes, ensuring that no orphaned or partial patient data remains in the database.

### Q6: How does your application prevent race conditions on database writes?
**Answer:**
> While SQLite handles read concurrency well in WAL mode, concurrent writes can trigger `sqlite3.OperationalError: database is locked`. We prevent this at the OS level by wrapping all write transactions in a `threading.Lock()` mutex in [`db/connection.py`](file:///d:/Healthcare_AI%20-%20Copy/db/connection.py#L98-L108). This serializes write access across all HTTP request worker threads.

### Q7: What are foreign key cascades and how did you implement them?
**Answer:**
> In [`db/schema.sql`](file:///d:/Healthcare_AI%20-%20Copy/db/schema.sql#L54), the `predictions` table defines `FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE`. SQLite requires `PRAGMA foreign_keys=ON` to enforce this rule. When a patient is deleted via `DELETE /history/patients/{id}`, the database engine automatically purges all corresponding prediction records without needing manual cleanup queries.

### Q8: What OS-level metrics are tracked in the `/system/health` endpoint?
**Answer:**
> Implemented in [`app/routes/system.py`](file:///d:/Healthcare_AI%20-%20Copy/app/routes/system.py), we utilize the `psutil` library and Python's `os` and `threading` modules to query real OS telemetry:
> - **Process Level:** Process ID (PID), CPU percentage, Resident Set Size (RSS memory in MB), and active OS threads.
> - **Thread Level:** Active thread count and active thread names (e.g. `predictor_0`, `Worker-1`, `Worker-2`, `asyncio-portal`).
> - **Host Level:** CPU core count, system-wide memory utilization, and available physical memory.

### Q9: How is First-Come, First-Served (FCFS) Scheduling and Bounded Concurrency demonstrated?
**Answer:**
> Implemented in [`app/services/workload_manager.py`](file:///d:/Healthcare_AI%20-%20Copy/app/services/workload_manager.py), the system maintains a thread-safe FIFO queue (`queue.Queue`) and exactly **2 concurrent worker threads (`Worker-1` and `Worker-2`)**. When 3 jobs are enqueued simultaneously via the **Enqueue Test Batch** button, Worker-1 and Worker-2 immediately acquire slots and transition to `ACTIVE`, while Job 3 sits in `QUEUED` state until one of the workers finishes. The system tracks real-time execution metrics:
> - **Queue Waiting Time:** Duration a job waited in the FCFS queue before being dequeued.
> - **Execution Time:** Active processing time for OCR extraction and ML model inference.
> - **Total Turnaround Time:** End-to-end duration from job submission to database commit.

---

## 5. Live Demonstration Commands for Examiners

To demonstrate the system live during your viva:

1. **Run Full Test Suite (17 tests covering all OS/DBMS/FCFS functionality):**
   ```powershell
   & ".\.venv\Scripts\python.exe" -m unittest discover -s tests -p "test_*.py"
   ```

2. **Start the FastAPI Application Server:**
   ```powershell
   & ".\.venv\Scripts\python.exe" -m uvicorn app.main:app --reload --port 8000
   ```

3. **Demonstrate FCFS Scheduling in Workload Manager:**
   Navigate to `http://localhost:5173/workload` and click **"Enqueue Test Batch"**. Watch Worker-1 and Worker-2 process jobs concurrently while the third waits in queue!

4. **Demonstrate Longitudinal Comparison:**
   Navigate to `http://localhost:5173/patients`, select 2 reports for a patient, and click **"Compare Selected (2)"** to inspect biometric parameter deltas and AI risk trajectories.

5. **Query OS Telemetry & Database Overview:**
   Navigate to `http://localhost:5173/system` and `http://localhost:5173/database`.

