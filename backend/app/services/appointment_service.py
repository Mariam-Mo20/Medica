from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.appointment import Appointment


async def check_conflict(
    db: AsyncSession,
    doctor_id: int | None,
    scheduled_at: datetime,
    duration_minutes: int,
    exclude_id: int | None = None,
) -> bool:
    if not doctor_id:
        return False

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


async def has_duplicate_patient_slot(
    db: AsyncSession,
    tenant_id: int,
    patient_id: int,
    scheduled_at: datetime,
    exclude_id: int | None = None,
) -> bool:
    query = select(Appointment).where(
        Appointment.tenant_id == tenant_id,
        Appointment.patient_id == patient_id,
        Appointment.scheduled_at == scheduled_at,
        Appointment.status.in_(["scheduled", "checked_in", "in_progress"]),
    )
    if exclude_id:
        query = query.where(Appointment.id != exclude_id)

    result = await db.execute(query)
    return result.scalar_one_or_none() is not None


async def generate_series_instances(
    _db: AsyncSession,
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
