from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from app.models.patient import Patient
from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.models.user import User
from app.core.config import settings
from app.schemas.dashboard import DashboardStats


async def get_dashboard_stats(db: AsyncSession, tenant_id: int) -> DashboardStats:
    clinic_now = datetime.now(ZoneInfo(settings.APP_TIMEZONE))
    today_start_local = clinic_now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end_local = clinic_now.replace(hour=23, minute=59, second=59, microsecond=999999)
    today_start = today_start_local.astimezone(timezone.utc)
    today_end = today_end_local.astimezone(timezone.utc)

    total_patients_result = await db.execute(
        select(func.count(Patient.id)).where(Patient.tenant_id == tenant_id)
    )
    total_patients = total_patients_result.scalar() or 0

    patients_today_result = await db.execute(
        select(func.count(func.distinct(Appointment.patient_id))).where(
            Appointment.tenant_id == tenant_id,
            Appointment.scheduled_at >= today_start,
            Appointment.scheduled_at <= today_end,
        )
    )
    patients_today = patients_today_result.scalar() or 0

    new_patients_today_result = await db.execute(
        select(func.count(Patient.id)).where(
            Patient.tenant_id == tenant_id,
            Patient.created_at >= today_start,
            Patient.created_at <= today_end,
        )
    )
    new_patients_today = new_patients_today_result.scalar() or 0

    today_appts_result = await db.execute(
        select(func.count(Appointment.id)).where(
            Appointment.tenant_id == tenant_id,
            Appointment.scheduled_at >= today_start,
            Appointment.scheduled_at <= today_end,
        )
    )
    today_appointments = today_appts_result.scalar() or 0

    completed_result = await db.execute(
        select(func.count(Appointment.id)).where(
            Appointment.tenant_id == tenant_id,
            Appointment.scheduled_at >= today_start,
            Appointment.scheduled_at <= today_end,
            Appointment.status == "completed",
        )
    )
    completed_appointments = completed_result.scalar() or 0

    cancelled_result = await db.execute(
        select(func.count(Appointment.id)).where(
            Appointment.tenant_id == tenant_id,
            Appointment.scheduled_at >= today_start,
            Appointment.scheduled_at <= today_end,
            Appointment.status == "cancelled",
        )
    )
    cancelled_appointments = cancelled_result.scalar() or 0

    pending_result = await db.execute(
        select(func.count(Appointment.id)).where(
            Appointment.tenant_id == tenant_id,
            Appointment.scheduled_at >= today_start,
            Appointment.scheduled_at <= today_end,
            Appointment.status.in_(["scheduled", "checked_in"]),
        )
    )
    pending_appointments = pending_result.scalar() or 0

    active_doctors_result = await db.execute(
        select(func.count(Doctor.id)).where(Doctor.tenant_id == tenant_id)
    )
    active_doctors = active_doctors_result.scalar() or 0

    status_counts_result = await db.execute(
        select(
            Appointment.status,
            func.count(Appointment.id).label("count"),
        ).where(
            Appointment.tenant_id == tenant_id,
            Appointment.scheduled_at >= today_start,
            Appointment.scheduled_at <= today_end,
        ).group_by(Appointment.status)
    )
    appointments_by_status = [
        {"status": row[0], "count": row[1]} for row in status_counts_result.all()
    ]

    recent_result = await db.execute(
        select(Appointment)
        .options(joinedload(Appointment.patient))
        .where(
            Appointment.tenant_id == tenant_id,
            Appointment.scheduled_at >= today_start,
            Appointment.scheduled_at <= today_end,
        )
        .order_by(Appointment.scheduled_at.desc())
        .limit(10)
    )
    recent = recent_result.scalars().all()
    recent_appointments = [
        {
            "id": a.id,
            "patient_id": a.patient_id,
            "patient_name": (
                f"{a.patient.first_name} {a.patient.last_name}".strip()
                if a.patient else None
            ),
            "doctor_id": a.doctor_id,
            "scheduled_at": str(a.scheduled_at),
            "status": a.status,
            "reason": a.reason,
        }
        for a in recent
    ]

    return DashboardStats(
        total_patients=total_patients,
        patients_today=patients_today,
        today_appointments=today_appointments,
        completed_appointments=completed_appointments,
        cancelled_appointments=cancelled_appointments,
        pending_appointments=pending_appointments,
        active_doctors=active_doctors,
        new_patients_today=new_patients_today,
        appointments_by_status=appointments_by_status,
        appointments_trend=[],
        recent_appointments=recent_appointments,
    )
