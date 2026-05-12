from pydantic import BaseModel
from datetime import datetime
from typing import Any


class TenantCreate(BaseModel):
    name: str
    slug: str
    settings: dict[str, Any] | None = None


class TenantUpdate(BaseModel):
    name: str | None = None
    settings: dict[str, Any] | None = None
    is_active: bool | None = None


class TenantResponse(BaseModel):
    id: int
    name: str
    slug: str
    settings: dict[str, Any] | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
