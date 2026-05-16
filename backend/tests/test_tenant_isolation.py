import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.patient import Patient
from app.models.appointment import Appointment
from app.models.user import User
from app.models.doctor import Doctor


@pytest.mark.asyncio
async def test_patients_list_scoped_to_tenant(db_session: AsyncSession, seed_data):
    tenant_a_id = seed_data["tenant_a"].id
    tenant_b_id = seed_data["tenant_b"].id

    result_a = await db_session.execute(
        select(Patient).where(Patient.tenant_id == tenant_a_id)
    )
    patients_a = result_a.scalars().all()
    assert len(patients_a) == 2

    for p in patients_a:
        assert p.tenant_id == tenant_a_id

    result_b = await db_session.execute(
        select(Patient).where(Patient.tenant_id == tenant_b_id)
    )
    patients_b = result_b.scalars().all()
    assert len(patients_b) == 1
    for p in patients_b:
        assert p.tenant_id == tenant_b_id


@pytest.mark.asyncio
async def test_appointments_list_scoped_to_tenant(db_session: AsyncSession, seed_data):
    tenant_a_id = seed_data["tenant_a"].id

    result = await db_session.execute(
        select(Appointment).where(Appointment.tenant_id == tenant_a_id)
    )
    appointments = result.scalars().all()
    assert len(appointments) == 2
    for a in appointments:
        assert a.tenant_id == tenant_a_id


@pytest.mark.asyncio
async def test_users_list_scoped_to_tenant(db_session: AsyncSession, seed_data):
    tenant_a_id = seed_data["tenant_a"].id
    tenant_b_id = seed_data["tenant_b"].id

    result_a = await db_session.execute(
        select(User).where(User.tenant_id == tenant_a_id)
    )
    users_a = result_a.scalars().all()
    assert len(users_a) == 2

    result_b = await db_session.execute(
        select(User).where(User.tenant_id == tenant_b_id)
    )
    users_b = result_b.scalars().all()
    assert len(users_b) == 1


@pytest.mark.asyncio
async def test_tenant_a_cannot_see_tenant_b_patients(db_session: AsyncSession, seed_data):
    tenant_a_id = seed_data["tenant_a"].id

    result = await db_session.execute(
        select(Patient).where(Patient.tenant_id == tenant_a_id)
    )
    patient_mrns = {p.medical_record_number for p in result.scalars().all()}
    assert "MRN-A001" in patient_mrns
    assert "MRN-A002" in patient_mrns
    assert "MRN-B001" not in patient_mrns


@pytest.mark.asyncio
async def test_tenant_b_cannot_see_tenant_a_appointments(db_session: AsyncSession, seed_data):
    tenant_b_id = seed_data["tenant_b"].id

    result = await db_session.execute(
        select(Appointment).where(Appointment.tenant_id == tenant_b_id)
    )
    apt_ids = {a.id for a in result.scalars().all()}
    assert 3 in apt_ids  # only tenant_b appointment
    assert 1 not in apt_ids
    assert 2 not in apt_ids


@pytest.mark.asyncio
async def test_doctor_list_scoped_to_tenant(db_session: AsyncSession, seed_data):
    tenant_a_id = seed_data["tenant_a"].id
    tenant_b_id = seed_data["tenant_b"].id

    result_a = await db_session.execute(
        select(Doctor).where(Doctor.tenant_id == tenant_a_id)
    )
    assert len(result_a.scalars().all()) == 1

    result_b = await db_session.execute(
        select(Doctor).where(Doctor.tenant_id == tenant_b_id)
    )
    assert len(result_b.scalars().all()) == 0
