from pydantic import BaseModel
from datetime import datetime
from typing import Any


class DoctorCreate(BaseModel):
    user_id: int
    specialization: str
    license_number: str | None = None
    schedule: dict[str, Any] | None = None


class DoctorUpdate(BaseModel):
    specialization: str | None = None
    license_number: str | None = None
    schedule: dict[str, Any] | None = None


class DoctorResponse(BaseModel):
    id: int
    tenant_id: int
    user_id: int
    full_name: str | None = None
    email: str | None = None
    specialization: str
    license_number: str | None
    schedule: dict[str, Any] | None
    created_at: datetime

    model_config = {"from_attributes": True}
