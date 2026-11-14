from typing import Optional, Dict
from pydantic import BaseModel
from prediction.prediction_result import PredictionResult


class ExecutionTimings(BaseModel):
    queue_wait_ms: float = 0.0
    execution_time_ms: float = 0.0
    total_turnaround_s: float = 0.0


class PredictionResponse(BaseModel):
    status: str
    patient_id: Optional[str | int] = None
    report_id: Optional[str] = None
    patient_name: Optional[str] = None
    filename: Optional[str] = None
    timings: Optional[ExecutionTimings] = None
    predictions: Dict[str, PredictionResult]