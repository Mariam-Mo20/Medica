from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from app.core.database import get_db
from app.middleware.auth_middleware import require_role
from app.middleware.tenant_middleware import get_current_tenant
from app.models.tenant import Tenant
from app.models.user import User
from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate, AppointmentResponse, AppointmentStatusUpdate
from app.services.appointment_service import check_conflict, generate_series_instances, appointment_to_response

router = APIRouter()


@router.post("/", response_model=AppointmentResponse, status_code=201)
async def create_appointment(
    data: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
    tenant: Tenant = Depends(get_current_tenant),
):
    if data.doctor_id:
        has_conflict = await check_conflict(db, data.doctor_id, data.scheduled_at, data.duration_minutes)
        if has_conflict:
            raise HTTPException(status_code=409, detail="Time slot conflicts with an existing appointment")

    appointment = Appointment(
        tenant_id=tenant.id,
        patient_id=data.patient_id,
        doctor_id=data.doctor_id,
        receptionist_id=current_user.id,
        scheduled_at=data.scheduled_at,
        duration_minutes=data.duration_minutes,
        reason=data.reason,
        status="scheduled",
        recurring_rule=data.recurring_rule,
        recurring_end_date=data.recurring_end_date,
    )
    db.add(appointment)
    await db.flush()

    if data.recurring_rule and data.recurring_end_date:
        instances = await generate_series_instances(db, appointment, tenant.id, current_user.id)
        for inst in instances:
            db.add(inst)

    await db.flush()
    await db.refresh(appointment)
    return await appointment_to_response(appointment, db)


@router.get("/", response_model=list[AppointmentResponse])
async def list_appointments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
    status: str | None = Query(None),
    doctor_id: int | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    query = (
        select(
            Appointment.id,
            Appointment.tenant_id,
            Appointment.patient_id,
            Appointment.doctor_id,
            Appointment.receptionist_id,
            Appointment.scheduled_at,
            Appointment.duration_minutes,
            Appointment.status,
            Appointment.reason,
            Appointment.notes,
            Appointment.recurring_rule,
            Appointment.recurring_end_date,
            Appointment.series_id,
            Appointment.is_series_cancelled,
            Appointment.created_at,
            Appointment.updated_at,
            Patient.first_name,
            Patient.last_name,
            User.full_name.label("doctor_name"),
        )
        .outerjoin(Patient, and_(Patient.id == Appointment.patient_id, Patient.tenant_id == current_user.tenant_id))
        .outerjoin(Doctor, and_(Doctor.id == Appointment.doctor_id, Doctor.tenant_id == current_user.tenant_id))
        .outerjoin(User, User.id == Doctor.user_id)
        .where(Appointment.tenant_id == current_user.tenant_id)
    )

    if status:
        query = query.where(Appointment.status == status)
    if doctor_id:
        query = query.where(Appointment.doctor_id == doctor_id)
    if date_from:
        from datetime import datetime
        query = query.where(Appointment.scheduled_at >= datetime.fromisoformat(date_from))
    if date_to:
        from datetime import datetime
        query = query.where(Appointment.scheduled_at <= datetime.fromisoformat(date_to))

    query = query.order_by(Appointment.scheduled_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    rows = result.all()

    return [
        AppointmentResponse(
            id=row.id,
            tenant_id=row.tenant_id,
            patient_id=row.patient_id,
            doctor_id=row.doctor_id,
            receptionist_id=row.receptionist_id,
            scheduled_at=row.scheduled_at,
            duration_minutes=row.duration_minutes,
            status=row.status,
            reason=row.reason,
            notes=row.notes,
            recurring_rule=row.recurring_rule,
            recurring_end_date=row.recurring_end_date,
            series_id=row.series_id,
            is_series_cancelled=row.is_series_cancelled,
            created_at=row.created_at,
            updated_at=row.updated_at,
            patient_name=f"{row.first_name} {row.last_name}".strip(),
            doctor_name=row.doctor_name,
        )
        for row in rows
    ]


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(
    appointment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
    tenant: Tenant = Depends(get_current_tenant),
):
    result = await db.execute(
        select(Appointment)
        .options(joinedload(Appointment.patient), joinedload(Appointment.doctor).joinedload(Doctor.user))
        .where(Appointment.id == appointment_id, Appointment.tenant_id == tenant.id)
    )
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return await appointment_to_response(appointment, db)


@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: int,
    data: AppointmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
    tenant: Tenant = Depends(get_current_tenant),
):
    result = await db.execute(
        select(Appointment)
        .options(joinedload(Appointment.patient), joinedload(Appointment.doctor).joinedload(Doctor.user))
        .where(Appointment.id == appointment_id, Appointment.tenant_id == tenant.id)
    )
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if data.scheduled_at or data.duration_minutes or data.doctor_id:
        doc_id = data.doctor_id or appointment.doctor_id
        sched = data.scheduled_at or appointment.scheduled_at
        dur = data.duration_minutes or appointment.duration_minutes
        has_conflict = await check_conflict(db, doc_id, sched, dur, exclude_id=appointment_id)
        if has_conflict:
            raise HTTPException(status_code=409, detail="Time slot conflicts with an existing appointment")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(appointment, field, value)

    await db.flush()
    await db.refresh(appointment)
    return await appointment_to_response(appointment, db)



@router.patch("/{appointment_id}/status", response_model=AppointmentResponse)
async def update_appointment_status(
    appointment_id: int,
    data: AppointmentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
    tenant: Tenant = Depends(get_current_tenant),
):
    valid_statuses = ["scheduled", "checked_in", "in_progress", "completed", "cancelled", "no_show"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    result = await db.execute(
        select(Appointment).where(Appointment.id == appointment_id, Appointment.tenant_id == tenant.id)
    )
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appointment.status = data.status
    await db.flush()
    await db.refresh(appointment)
    return await appointment_to_response(appointment, db)


@router.delete("/{appointment_id}")
async def cancel_appointment(
    appointment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
    tenant: Tenant = Depends(get_current_tenant),
):
    result = await db.execute(
        select(Appointment).where(Appointment.id == appointment_id, Appointment.tenant_id == tenant.id)
    )
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appointment.status = "cancelled"

    if appointment.series_id:
        await db.execute(
            __import__("sqlalchemy").update(Appointment)
            .where(
                Appointment.series_id == appointment.series_id,
                Appointment.tenant_id == tenant.id,
                Appointment.id != appointment_id,
            )
            .values(status="cancelled")
        )

    await db.flush()
    return {"message": "Appointment cancelled"}
