from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.middleware.auth_middleware import get_current_user, require_role
from app.middleware.tenant_middleware import get_current_tenant
from app.models.tenant import Tenant
from app.models.user import User
from app.models.notification import Notification
from app.models.appointment import Appointment
from app.models.patient import Patient
from app.schemas.notification import NotificationResponse, NotificationListResponse

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


@router.post("/share-appointment/{appointment_id}", response_model=NotificationResponse)
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

    from app.models.doctor import Doctor

    if not appointment.doctor_id:
        raise HTTPException(status_code=400, detail="No doctor assigned to this appointment")

    doctor_result = await db.execute(
        select(Doctor).where(Doctor.id == appointment.doctor_id)
    )
    doctor = doctor_result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=400, detail="Doctor not found")

    doctor_user_result = await db.execute(
        select(User).where(User.id == doctor.user_id)
    )
    doctor_user = doctor_user_result.scalar_one_or_none()
    if not doctor_user:
        raise HTTPException(status_code=400, detail="Doctor user not found")

    notification = Notification(
        tenant_id=tenant.id,
        recipient_id=doctor_user.id,
        sender_id=current_user.id,
        notification_type="patient_shared",
        title=f"Patient Shared: {patient_name}",
        message=f"{current_user.full_name} shared patient {patient_name} with you.",
        resource_type="patient",
        resource_id=patient.id,
    )
    db.add(notification)
    await db.flush()

    resp = NotificationResponse.model_validate(notification)
    resp.sender_name = current_user.full_name
    return resp
