from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from time import perf_counter
from app.models.patient import Patient
from app.models.appointment import Appointment
from app.core.config import settings
from app.schemas.dashboard import DashboardStats


async def get_dashboard_stats(db: AsyncSession, tenant_id: int) -> DashboardStats:
    async def timed_execute(label: str, statement):
        if not settings.DEBUG:
            return await db.execute(statement)
        started_at = perf_counter()
        result = await db.execute(statement)
        duration_ms = (perf_counter() - started_at) * 1000
        print(f"[perf][dashboard] {label}: {duration_ms:.1f}ms", flush=True)
        return result

    clinic_now = datetime.now(ZoneInfo(settings.APP_TIMEZONE))
    today_start_local = clinic_now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end_local = clinic_now.replace(hour=23, minute=59, second=59, microsecond=999999)
    today_start = today_start_local.astimezone(timezone.utc)
    today_end = today_end_local.astimezone(timezone.utc)

    today_scope = and_(
        Appointment.tenant_id == tenant_id,
        Appointment.scheduled_at >= today_start,
        Appointment.scheduled_at <= today_end,
    )

    summary_result = await timed_execute(
        "summary_stats",
        select(
            select(func.count(Patient.id))
            .where(Patient.tenant_id == tenant_id)
            .scalar_subquery()
            .label("total_patients"),
            select(func.count(Patient.id))
            .where(
                Patient.tenant_id == tenant_id,
                Patient.created_at >= today_start,
                Patient.created_at <= today_end,
            )
            .scalar_subquery()
            .label("new_patients_today"),
            select(func.count(Appointment.id))
            .where(today_scope)
            .scalar_subquery()
            .label("today_appointments"),
            select(func.count(Appointment.id))
            .where(today_scope, Appointment.status == "completed")
            .scalar_subquery()
            .label("completed_appointments"),
            select(func.count(Appointment.id))
            .where(today_scope, Appointment.status == "cancelled")
            .scalar_subquery()
            .label("cancelled_appointments"),
            select(func.count(Appointment.id))
            .where(today_scope, Appointment.status == "scheduled")
            .scalar_subquery()
            .label("scheduled_appointments"),
            select(func.count(Appointment.id))
            .where(today_scope, Appointment.status == "checked_in")
            .scalar_subquery()
            .label("checked_in_appointments"),
            select(func.count(Appointment.id))
            .where(today_scope, Appointment.status == "in_progress")
            .scalar_subquery()
            .label("in_progress_appointments"),
            select(func.count(Appointment.id))
            .where(today_scope, Appointment.status.in_(["scheduled", "checked_in"]))
            .scalar_subquery()
            .label("pending_appointments"),
            select(func.count(func.distinct(Appointment.patient_id)))
            .where(today_scope)
            .scalar_subquery()
            .label("patients_today"),
        )
    )
    summary = summary_result.one()
    total_patients = summary.total_patients or 0
    new_patients_today = summary.new_patients_today or 0
    today_appointments = summary.today_appointments or 0
    completed_appointments = summary.completed_appointments or 0
    cancelled_appointments = summary.cancelled_appointments or 0
    scheduled_appointments = summary.scheduled_appointments or 0
    checked_in_appointments = summary.checked_in_appointments or 0
    in_progress_appointments = summary.in_progress_appointments or 0
    pending_appointments = summary.pending_appointments or 0
    patients_today = summary.patients_today or 0
    appointments_by_status = [
        {"status": "scheduled", "count": scheduled_appointments},
        {"status": "checked_in", "count": checked_in_appointments},
        {"status": "in_progress", "count": in_progress_appointments},
        {"status": "completed", "count": completed_appointments},
        {"status": "cancelled", "count": cancelled_appointments},
    ]

    recent_result = await timed_execute(
        "recent_appointments",
        select(
            Appointment.id,
            Appointment.patient_id,
            Appointment.doctor_id,
            Appointment.scheduled_at,
            Appointment.status,
            Appointment.reason,
            Patient.first_name,
            Patient.last_name,
        )
        .join(Patient, Patient.id == Appointment.patient_id)
        .where(
            Appointment.tenant_id == tenant_id,
            Patient.tenant_id == tenant_id,
            Appointment.scheduled_at >= today_start,
            Appointment.scheduled_at <= today_end,
        )
        .order_by(Appointment.scheduled_at.desc())
        .limit(10)
    )
    recent = recent_result.all()
    recent_appointments = [
        {
            "id": row.id,
            "patient_id": row.patient_id,
            "patient_name": f"{row.first_name} {row.last_name}".strip(),
            "doctor_id": row.doctor_id,
            "scheduled_at": str(row.scheduled_at),
            "status": row.status,
            "reason": row.reason,
        }
        for row in recent
    ]

    return DashboardStats(
        total_patients=total_patients,
        patients_today=patients_today,
        today_appointments=today_appointments,
        completed_appointments=completed_appointments,
        cancelled_appointments=cancelled_appointments,
        pending_appointments=pending_appointments,
        new_patients_today=new_patients_today,
        appointments_by_status=appointments_by_status,
        appointments_trend=[],
        recent_appointments=recent_appointments,
    )
