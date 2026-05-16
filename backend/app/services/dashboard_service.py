from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from time import perf_counter
from app.models.patient import Patient
from app.models.appointment import Appointment
from app.core.config import settings
from app.schemas.dashboard import DashboardStats


async def get_dashboard_stats(db: AsyncSession, tenant_id: int) -> DashboardStats:
    async def timed_execute(label: str, stmt):
        started_at = perf_counter()
        result = await db.execute(stmt)
        duration_ms = (perf_counter() - started_at) * 1000
        print(f"[perf][dashboard] {label}: {duration_ms:.1f}ms", flush=True)
        return result

    clinic_now = datetime.now(ZoneInfo(settings.APP_TIMEZONE))
    today_start_local = clinic_now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end_local = clinic_now.replace(hour=23, minute=59, second=59, microsecond=999999)
    today_start = today_start_local.astimezone(timezone.utc)
    today_end = today_end_local.astimezone(timezone.utc)

    patient_stats_result = await timed_execute(
        "patient_stats",
        select(
            func.count(Patient.id)
            .filter(Patient.tenant_id == tenant_id)
            .label("total_patients"),
            func.count(Patient.id)
            .filter(
                Patient.tenant_id == tenant_id,
                Patient.created_at >= today_start,
                Patient.created_at <= today_end,
            )
            .label("new_patients_today"),
        )
    )
    patient_stats = patient_stats_result.one()
    total_patients = patient_stats.total_patients or 0
    new_patients_today = patient_stats.new_patients_today or 0

    appointment_stats_result = await timed_execute(
        "appointment_stats",
        select(
            func.count(Appointment.id).label("today_appointments"),
            func.count(Appointment.id)
            .filter(Appointment.status == "completed")
            .label("completed_appointments"),
            func.count(Appointment.id)
            .filter(Appointment.status == "cancelled")
            .label("cancelled_appointments"),
            func.count(Appointment.id)
            .filter(Appointment.status == "scheduled")
            .label("scheduled_appointments"),
            func.count(Appointment.id)
            .filter(Appointment.status == "checked_in")
            .label("checked_in_appointments"),
            func.count(Appointment.id)
            .filter(Appointment.status == "in_progress")
            .label("in_progress_appointments"),
            func.count(Appointment.id)
            .filter(Appointment.status.in_(["scheduled", "checked_in"]))
            .label("pending_appointments"),
            func.count(func.distinct(Appointment.patient_id)).label("patients_today"),
        ).where(
            Appointment.tenant_id == tenant_id,
            Appointment.scheduled_at >= today_start,
            Appointment.scheduled_at <= today_end,
        )
    )
    appointment_stats = appointment_stats_result.one()
    today_appointments = appointment_stats.today_appointments or 0
    completed_appointments = appointment_stats.completed_appointments or 0
    cancelled_appointments = appointment_stats.cancelled_appointments or 0
    scheduled_appointments = appointment_stats.scheduled_appointments or 0
    checked_in_appointments = appointment_stats.checked_in_appointments or 0
    in_progress_appointments = appointment_stats.in_progress_appointments or 0
    pending_appointments = appointment_stats.pending_appointments or 0
    patients_today = appointment_stats.patients_today or 0
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
