from pydantic import BaseModel, EmailStr
from datetime import datetime


class InvitationCreate(BaseModel):
    email: EmailStr | None = None
    role: str = "assistant"


class InvitationAccept(BaseModel):
    token: str
    password: str
    full_name: str
    phone: str | None = None


class InvitationCheckResponse(BaseModel):
    valid: bool
    email: str | None = None
    role: str | None = None
    message: str | None = None


class InvitationResponse(BaseModel):
    id: int
    clinic_id: int
    doctor_id: int
    email: str | None = None
    role: str
    token: str
    status: str
    expires_at: datetime
    accepted_at: datetime | None = None
    created_at: datetime
    doctor_name: str | None = None

    model_config = {"from_attributes": True}
