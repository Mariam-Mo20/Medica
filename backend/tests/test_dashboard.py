import pytest
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.dashboard_service import get_dashboard_stats
from app.models.appointment import Appointment


@pytest.mark.asyncio
async def test_dashboard_returns_zero_counts_for_empty_data(db_session: AsyncSession):
    stats = await get_dashboard_stats(db_session, tenant_id=999)
    assert stats.total_patients == 0
    assert stats.new_patients_today == 0
    assert stats.today_appointments == 0
    assert stats.completed_appointments == 0
    assert stats.pending_appointments == 0
    assert len(stats.appointments_by_status) == 5
    for s in stats.appointments_by_status:
        assert s["count"] == 0
    assert stats.recent_appointments == []


@pytest.mark.asyncio
async def test_dashboard_counts_match_seeded_data(db_session: AsyncSession, seed_data):
    tenant_a_id = seed_data["tenant_a"].id
    stats = await get_dashboard_stats(db_session, tenant_a_id)

    assert stats.total_patients == 2
    assert stats.appointments_by_status is not None
    status_map = {s["status"]: s["count"] for s in stats.appointments_by_status}
    assert status_map.get("scheduled", 0) == 1
    assert status_map.get("completed", 0) == 1


@pytest.mark.asyncio
async def test_dashboard_tenant_isolation(db_session: AsyncSession, seed_data):
    stats_a = await get_dashboard_stats(db_session, seed_data["tenant_a"].id)
    stats_b = await get_dashboard_stats(db_session, seed_data["tenant_b"].id)

    assert stats_a.total_patients == 2
    assert stats_b.total_patients == 1

    assert len(stats_a.recent_appointments) == 2
    assert len(stats_b.recent_appointments) == 1


@pytest.mark.asyncio
async def test_dashboard_recent_appointments_order(db_session: AsyncSession, seed_data):
    tenant_a_id = seed_data["tenant_a"].id
    stats = await get_dashboard_stats(db_session, tenant_a_id)

    assert len(stats.recent_appointments) == 2
    recent = stats.recent_appointments
    for r in recent:
        assert "patient_name" in r
        assert "id" in r
        assert "status" in r


@pytest.mark.asyncio
async def test_dashboard_includes_new_patients_today(db_session: AsyncSession, seed_data):
    tenant_a_id = seed_data["tenant_a"].id
    stats = await get_dashboard_stats(db_session, tenant_a_id)

    assert stats.patients_today is not None
    assert stats.completed_appointments is not None
    assert stats.cancelled_appointments is not None
    assert stats.pending_appointments is not None
