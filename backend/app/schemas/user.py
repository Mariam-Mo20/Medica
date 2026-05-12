from pydantic import BaseModel, EmailStr
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "doctor"
    phone: str | None = None


class UserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    role: str | None = None
    is_active: bool | None = None


class UserResponse(BaseModel):
    id: int
    tenant_id: int
    email: str
    full_name: str
    role: str
    phone: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
