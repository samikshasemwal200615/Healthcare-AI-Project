-- Healthcare AI Database Schema
-- Relational design: patients (1) → predictions (many), patients (1) → audit_log (many)

-- Patients table: stores each submitted patient record
CREATE TABLE IF NOT EXISTS patients (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    age                         INTEGER,
    gender                      TEXT,
    height                      REAL,
    weight                      REAL,
    pregnancies                 INTEGER,
    glucose                     REAL,
    bloodpressure               REAL,
    skinthickness               REAL,
    insulin                     REAL,
    bmi                         REAL,
    diabetespedigreefunction    REAL,
    total_bilirubin             REAL,
    direct_bilirubin            REAL,
    alkaline_phosphatase        REAL,
    alt                         REAL,
    ast                         REAL,
    total_proteins              REAL,
    albumin                     REAL,
    albumin_globulin_ratio      REAL,
    systolic_bp                 INTEGER,
    diastolic_bp                INTEGER,
    cholesterol                 INTEGER,
    gluc                        INTEGER,
    smoke                       INTEGER,    -- 0/1 (boolean stored as int)
    alco                        INTEGER,    -- 0/1
    active                      INTEGER,    -- 0/1
    created_at                  TEXT NOT NULL DEFAULT (datetime('now')),
    -- CHECK constraints enforce data consistency (ACID: Consistency)
    CONSTRAINT chk_age      CHECK (age IS NULL OR age > 0),
    CONSTRAINT chk_height   CHECK (height IS NULL OR height > 0),
    CONSTRAINT chk_weight   CHECK (weight IS NULL OR weight > 0),
    CONSTRAINT chk_glucose  CHECK (glucose IS NULL OR glucose >= 0),
    CONSTRAINT chk_bmi      CHECK (bmi IS NULL OR bmi >= 0),
    CONSTRAINT chk_systolic CHECK (systolic_bp IS NULL OR systolic_bp >= 0),
    CONSTRAINT chk_diastolic CHECK (diastolic_bp IS NULL OR diastolic_bp >= 0)
);

-- Predictions table: stores each disease prediction result
-- Foreign key to patients enforces referential integrity
CREATE TABLE IF NOT EXISTS predictions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id      INTEGER NOT NULL,
    disease         TEXT NOT NULL,
    prediction      INTEGER NOT NULL,       -- 0 (negative) or 1 (positive)
    probability     REAL NOT NULL,
    model_version   TEXT NOT NULL DEFAULT '1.0.0',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Audit log: tracks every API request for traceability
-- Records OS-level info: thread name, process ID, timing
CREATE TABLE IF NOT EXISTS audit_log (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint            TEXT NOT NULL,
    method              TEXT NOT NULL,
    status_code         INTEGER,
    patient_id          INTEGER,
    processing_time_ms  REAL,
    worker_thread       TEXT,
    process_id          INTEGER,
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL
);

-- Indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_predictions_patient  ON predictions(patient_id);
CREATE INDEX IF NOT EXISTS idx_predictions_disease  ON predictions(disease);
CREATE INDEX IF NOT EXISTS idx_audit_log_endpoint   ON audit_log(endpoint);
CREATE INDEX IF NOT EXISTS idx_patients_created     ON patients(created_at);

-- Registered Patients table: stores named demographic patient records
CREATE TABLE IF NOT EXISTS registered_patients (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    gender          TEXT NOT NULL,
    dob             TEXT NOT NULL,
    clinical_notes  TEXT DEFAULT '',
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Lab Reports table: stores longitudinal lab reports linked to registered patients
CREATE TABLE IF NOT EXISTS lab_reports (
    id                  TEXT PRIMARY KEY,
    patient_id          TEXT,
    patient_name        TEXT,
    filename            TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'Completed',
    biomarkers_count    INTEGER DEFAULT 0,
    parameters          TEXT DEFAULT '{}',
    predictions         TEXT DEFAULT '{}',
    uploaded_at         TEXT NOT NULL DEFAULT (datetime('now')),
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (patient_id) REFERENCES registered_patients(id) ON DELETE CASCADE
);

-- Workload Jobs table: stores FCFS scheduled report processing jobs
CREATE TABLE IF NOT EXISTS workload_jobs (
    id                  TEXT PRIMARY KEY,
    filename            TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'QUEUED',
    worker              TEXT DEFAULT 'Unassigned',
    report_id           TEXT,
    patient_id          TEXT,
    patient_name        TEXT,
    submitted_at        TEXT NOT NULL,
    started_at          TEXT,
    completed_at        TEXT,
    queue_wait_ms       REAL DEFAULT 0,
    execution_ms        REAL DEFAULT 0,
    total_turnaround_s  REAL DEFAULT 0,
    timeline            TEXT DEFAULT '[]',
    error_message       TEXT
);

CREATE INDEX IF NOT EXISTS idx_lab_reports_patient  ON lab_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_workload_status      ON workload_jobs(status);

