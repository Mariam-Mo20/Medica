from pydantic import BaseModel
from datetime import datetime


class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: int | None = None
    scheduled_at: datetime
    duration_minutes: int = 30
    reason: str | None = None
    recurring_rule: str | None = None
    recurring_end_date: datetime | None = None


class AppointmentUpdate(BaseModel):
    scheduled_at: datetime | None = None
    duration_minutes: int | None = None
    status: str | None = None
    reason: str | None = None
    notes: str | None = None
    doctor_id: int | None = None


class AppointmentResponse(BaseModel):
    id: int
    tenant_id: int
    patient_id: int
    doctor_id: int | None
    receptionist_id: int | None
    scheduled_at: datetime
    duration_minutes: int
    status: str
    reason: str | None
    notes: str | None
    recurring_rule: str | None
    recurring_end_date: datetime | None
    series_id: str | None
    is_series_cancelled: bool
    created_at: datetime
    updated_at: datetime
    patient_name: str | None = None
    doctor_name: str | None = None

    model_config = {"from_attributes": True}


class AppointmentStatusUpdate(BaseModel):
    status: str
