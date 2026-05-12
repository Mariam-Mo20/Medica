from pydantic import BaseModel
from datetime import date, datetime


class PatientCreate(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: date
    gender: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None


class PatientUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None


class PatientResponse(BaseModel):
    id: int
    tenant_id: int
    medical_record_number: str
    first_name: str
    last_name: str
    date_of_birth: date
    gender: str | None
    phone: str | None
    email: str | None
    address: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PatientSearchResult(BaseModel):
    id: int
    medical_record_number: str
    first_name: str
    last_name: str
    phone: str | None
    date_of_birth: date
