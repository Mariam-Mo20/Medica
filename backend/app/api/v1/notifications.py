from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.middleware.auth_middleware import get_current_user, require_role
from app.middleware.tenant_middleware import get_current_tenant
from app.models.tenant import Tenant
from app.models.user import User
from app.models.notification import Notification
from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.models.patient import Patient
from pydantic import BaseModel
from app.schemas.notification import NotificationResponse, NotificationListResponse


class ShareResponse(BaseModel):
    message: str
    notified_doctors: int

router = APIRouter()


@router.get("/", response_model=NotificationListResponse)
async def list_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
    tenant: Tenant = Depends(get_current_tenant),
):
    result = await db.execute(
        select(Notification)
        .where(
            Notification.tenant_id == tenant.id,
            Notification.recipient_id == current_user.id,
        )
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    notifications = result.scalars().all()

    unread_result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.tenant_id == tenant.id,
            Notification.recipient_id == current_user.id,
            Notification.is_read == False,
        )
    )
    unread_count = unread_result.scalar() or 0

    items = []
    for n in notifications:
        resp = NotificationResponse.model_validate(n)
        if n.sender_id:
            sender_result = await db.execute(select(User).where(User.id == n.sender_id))
            sender = sender_result.scalar_one_or_none()
            if sender:
                resp.sender_name = sender.full_name
        items.append(resp)

    return NotificationListResponse(notifications=items, unread_count=unread_count)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
    tenant: Tenant = Depends(get_current_tenant),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.recipient_id == current_user.id,
            Notification.tenant_id == tenant.id,
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    await db.flush()
    resp = NotificationResponse.model_validate(notification)
    if notification.sender_id:
        sender_result = await db.execute(select(User).where(User.id == notification.sender_id))
        sender = sender_result.scalar_one_or_none()
        if sender:
            resp.sender_name = sender.full_name
    return resp


@router.post("/share-appointment/{appointment_id}")
async def share_appointment_patient(
    appointment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
    tenant: Tenant = Depends(get_current_tenant),
):
    appointment_result = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.tenant_id == tenant.id,
        )
    )
    appointment = appointment_result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    patient_result = await db.execute(
        select(Patient).where(Patient.id == appointment.patient_id)
    )
    patient = patient_result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient_name = f"{patient.first_name} {patient.last_name}"
    visit_reason = appointment.reason or "Medical Visit"

    doctor_users_result = await db.execute(
        select(User).join(Doctor, Doctor.user_id == User.id).where(
            Doctor.tenant_id == tenant.id,
            User.is_active == True,
        )
    )
    doctor_users = doctor_users_result.scalars().all()

    if not doctor_users:
        raise HTTPException(status_code=400, detail="No doctors found in the clinic")

    count = 0
    for doctor_user in doctor_users:
        if doctor_user.id == current_user.id:
            continue
        notification = Notification(
            tenant_id=tenant.id,
            recipient_id=doctor_user.id,
            sender_id=current_user.id,
            notification_type="patient_shared",
            title=f"{patient_name} it is waiting",
            message=visit_reason,
            resource_type="patient",
            resource_id=patient.id,
        )
        db.add(notification)
        count += 1

    appointment.status = "in_progress"
    await db.flush()
    return ShareResponse(
        message=f"Patient shared with {count} doctor{'s' if count != 1 else ''}",
        notified_doctors=count,
    )
