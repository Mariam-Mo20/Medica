from datetime import datetime, timedelta
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.user import User
from app.schemas.appointment import AppointmentResponse


async def check_conflict(
    db: AsyncSession,
    doctor_id: int,
    scheduled_at: datetime,
    duration_minutes: int,
    exclude_id: int | None = None,
) -> bool:
    start = scheduled_at
    end = scheduled_at + timedelta(minutes=duration_minutes)

    query = select(Appointment).where(
        Appointment.doctor_id == doctor_id,
        Appointment.status.in_(["scheduled", "checked_in", "in_progress"]),
        Appointment.scheduled_at < end,
        Appointment.scheduled_at + (Appointment.duration_minutes * timedelta(minutes=1)) > start,
    )
    if exclude_id:
        query = query.where(Appointment.id != exclude_id)

    result = await db.execute(query)
    return result.scalar_one_or_none() is not None


async def generate_series_instances(
    db: AsyncSession,
    appointment: Appointment,
    tenant_id: int,
    user_id: int,
) -> list[Appointment]:
    from dateutil.rrule import rrulestr
    import uuid

    instances = []
    rule = rrulestr(appointment.recurring_rule, dtstart=appointment.scheduled_at.replace(tzinfo=None))

    series_id = str(uuid.uuid4())
    appointment.series_id = series_id

    for dt in rule:
        if dt == appointment.scheduled_at.replace(tzinfo=None):
            continue
        if appointment.recurring_end_date and dt > appointment.recurring_end_date.replace(tzinfo=None):
            break

        inst = Appointment(
            tenant_id=tenant_id,
            patient_id=appointment.patient_id,
            doctor_id=appointment.doctor_id,
            receptionist_id=user_id,
            scheduled_at=dt.replace(tzinfo=appointment.scheduled_at.tzinfo),
            duration_minutes=appointment.duration_minutes,
            status="scheduled",
            reason=appointment.reason,
            series_id=series_id,
            parent_appointment_id=appointment.id,
            recurring_rule=appointment.recurring_rule,
            recurring_end_date=appointment.recurring_end_date,
        )
        instances.append(inst)

    return instances


async def appointment_to_response(appointment: Appointment, db: AsyncSession) -> AppointmentResponse:
    resp = AppointmentResponse(
        id=appointment.id,
        tenant_id=appointment.tenant_id,
        patient_id=appointment.patient_id,
        doctor_id=appointment.doctor_id,
        receptionist_id=appointment.receptionist_id,
        scheduled_at=appointment.scheduled_at,
        duration_minutes=appointment.duration_minutes,
        status=appointment.status,
        reason=appointment.reason,
        notes=appointment.notes,
        recurring_rule=appointment.recurring_rule,
        recurring_end_date=appointment.recurring_end_date,
        series_id=appointment.series_id,
        is_series_cancelled=appointment.is_series_cancelled,
        created_at=appointment.created_at,
        updated_at=appointment.updated_at,
    )

    patient = getattr(appointment, "patient", None)
    if patient is None and appointment.patient_id:
        patient_result = await db.execute(select(Patient).where(Patient.id == appointment.patient_id))
        patient = patient_result.scalar_one_or_none()
    if patient:
        resp.patient_name = f"{patient.first_name} {patient.last_name}"

    doctor = getattr(appointment, "doctor", None)
    if doctor is None and appointment.doctor_id:
        doctor_result = await db.execute(select(Doctor).where(Doctor.id == appointment.doctor_id))
        doctor = doctor_result.scalar_one_or_none()
    if doctor:
        doctor_user = getattr(doctor, "user", None)
        if doctor_user is None:
            user_result = await db.execute(select(User).where(User.id == doctor.user_id))
            doctor_user = user_result.scalar_one_or_none()
        if doctor_user:
            resp.doctor_name = doctor_user.full_name

    return resp
