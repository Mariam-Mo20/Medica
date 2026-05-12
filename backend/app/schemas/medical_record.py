from pydantic import BaseModel
from datetime import datetime


class MedicalRecordCreate(BaseModel):
    appointment_id: int | None = None
    patient_id: int | None = None
    diagnosis: str | None = None
    symptoms: str | None = None
    visit_notes: str | None = None


class MedicalRecordUpdate(BaseModel):
    diagnosis: str | None = None
    symptoms: str | None = None
    visit_notes: str | None = None


class MedicalRecordResponse(BaseModel):
    id: int
    tenant_id: int
    patient_id: int
    appointment_id: int | None = None
    doctor_id: int
    diagnosis: str | None
    symptoms: str | None
    visit_notes: str | None
    created_at: datetime
    updated_at: datetime
    doctor_name: str | None = None
    appointment_date: datetime | None = None

    model_config = {"from_attributes": True}
