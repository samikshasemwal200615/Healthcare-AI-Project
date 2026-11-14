from typing import Any, Optional
from pydantic import BaseModel


class ContinuePredictionRequest(BaseModel):
    report_data: dict[str, Any]
    user_answers: dict[str, Any]
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    filename: Optional[str] = None
    queue_wait_ms: Optional[float] = 0.0
    submitted_timestamp: Optional[float] = None