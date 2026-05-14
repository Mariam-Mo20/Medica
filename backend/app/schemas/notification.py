from pydantic import BaseModel
from datetime import datetime


class NotificationResponse(BaseModel):
    id: int
    tenant_id: int
    recipient_id: int
    sender_id: int | None = None
    notification_type: str
    title: str
    message: str | None = None
    resource_type: str | None = None
    resource_id: int | None = None
    is_read: bool
    created_at: datetime
    sender_name: str | None = None

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    notifications: list[NotificationResponse]
    unread_count: int
