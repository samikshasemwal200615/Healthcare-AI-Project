from typing import Any, Optional, List
from pydantic import BaseModel


class Question(BaseModel):
    field: str
    question: str
    type: str
    options: Optional[List[Any]] = None


class QuestionnaireResponse(BaseModel):
    status: str
    questions: List[Question]
    report_data: dict[str, Any]
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    filename: Optional[str] = None
    queue_wait_ms: Optional[float] = 0.0
    submitted_timestamp: Optional[float] = None