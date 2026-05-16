from pydantic import BaseModel
from typing import Any


class DashboardStats(BaseModel):
    total_patients: int = 0
    patients_today: int = 0
    today_appointments: int = 0
    completed_appointments: int = 0
    cancelled_appointments: int = 0
    pending_appointments: int = 0
    new_patients_today: int = 0
    appointments_by_status: list[dict[str, Any]] = []
    appointments_trend: list[dict[str, Any]] = []
    recent_appointments: list[dict[str, Any]] = []
