"""Workload API routes.

Provides endpoints for monitoring and interacting with the FCFS job queue
and bounded 2-worker pool.
"""

from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from app.services.workload_manager import WorkloadManager

router = APIRouter(prefix="/jobs", tags=["Workload"])


@router.get("/stats")
def get_workload_stats():
    """Retrieve real-time workload statistics and worker pool status."""
    manager = WorkloadManager.get_instance()
    return manager.get_stats()


@router.get("/")
def list_jobs(
    category: str = Query("all", description="queue, active, history, or all"),
    limit: int = Query(50, ge=1, le=200),
):
    """List jobs filtered by status category."""
    manager = WorkloadManager.get_instance()
    jobs = manager.list_jobs(category=category, limit=limit)
    return {"jobs": jobs}


@router.get("/{job_id}")
def get_job_detail(job_id: str):
    """Retrieve full details of a specific job, including execution timings and timeline."""
    manager = WorkloadManager.get_instance()
    job = manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job": job}


@router.post("/enqueue-test-batch")
def enqueue_test_batch():
    """Enqueue 3 synthetic jobs simultaneously to demonstrate FCFS scheduling and bounded worker pool (2 workers)."""
    manager = WorkloadManager.get_instance()
    enqueued = manager.enqueue_test_batch()
    return {
        "message": "Enqueued 3 jobs simultaneously to demonstrate FCFS scheduling and bounded worker pool (2 workers).",
        "jobs": enqueued,
    }


@router.post("/upload")
async def enqueue_uploaded_report(
    file: UploadFile = File(...),
    patient_name: Optional[str] = Form(None),
    patient_id: Optional[str] = Form(None),
):
    """Enqueue an uploaded PDF/image into the FCFS processing queue with disk-backed storage for OCR."""
    import tempfile
    import shutil
    from pathlib import Path
    from app.config import UPLOAD_DIR

    UPLOAD_DIR.mkdir(exist_ok=True)
    suffix = Path(file.filename).suffix if file.filename else ".pdf"
    tmp = tempfile.NamedTemporaryFile(
        dir=str(UPLOAD_DIR), suffix=suffix, delete=False
    )
    with tmp:
        shutil.copyfileobj(file.file, tmp)

    file_path = str(tmp.name)

    manager = WorkloadManager.get_instance()
    job = manager.enqueue_job(
        filename=file.filename or "uploaded_report.pdf",
        patient_name=patient_name or "Anonymous",
        patient_id=patient_id,
        file_path=file_path,
        simulate_duration=1.5,
    )
    return {
        "message": f"Report '{job['filename']}' successfully enqueued in FCFS queue",
        "job": job,
    }

