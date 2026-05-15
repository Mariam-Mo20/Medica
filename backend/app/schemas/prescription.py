from pydantic import BaseModel
from datetime import datetime


class PrescriptionCreate(BaseModel):
    medication_name: str
    dosage: str
    frequency: str
    duration: str | None = None
    instructions: str | None = None


class PrescriptionResponse(BaseModel):
    id: int
    tenant_id: int
    medical_record_id: int
    doctor_id: int | None = None
    medication_name: str
    dosage: str
    frequency: str
    duration: str | None
    instructions: str | None
    created_at: datetime
    doctor_name: str | None = None

    model_config = {"from_attributes": True}
