import pytest
import pytest_asyncio
from datetime import datetime, date, timezone
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.core.database import Base
from app.models.user import User
from app.models.tenant import Tenant
from app.models.patient import Patient
from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.core.security import hash_password


TEST_DB_URL = "sqlite+aiosqlite://"


@pytest_asyncio.fixture(scope="session")
async def async_engine():
    engine = create_async_engine(TEST_DB_URL, echo=False)

    @event.listens_for(engine.sync_engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(async_engine):
    session_factory = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def seed_data(db_session: AsyncSession):
    now = datetime.now(timezone.utc)

    tenant_a = Tenant(id=1, name="Clinic Alpha", slug="alpha", is_active=True)
    tenant_b = Tenant(id=2, name="Clinic Beta", slug="beta", is_active=True)
    db_session.add_all([tenant_a, tenant_b])
    await db_session.flush()

    doctor_user_a = User(
        id=1, tenant_id=1, email="doctor@alpha.com", password_hash=hash_password("pass"),
        full_name="Dr. Alpha", role="doctor", is_active=True,
    )
    assistant_user_a = User(
        id=2, tenant_id=1, email="assistant@alpha.com", password_hash=hash_password("pass"),
        full_name="Asst. Alpha", role="assistant", is_active=True,
    )
    doctor_user_b = User(
        id=3, tenant_id=2, email="doctor@beta.com", password_hash=hash_password("pass"),
        full_name="Dr. Beta", role="doctor", is_active=True,
    )
    db_session.add_all([doctor_user_a, assistant_user_a, doctor_user_b])
    await db_session.flush()

    doctor_a = Doctor(id=1, tenant_id=1, user_id=1, specialization="General")
    db_session.add(doctor_a)
    await db_session.flush()

    patient_a1 = Patient(
        id=1, tenant_id=1, medical_record_number="MRN-A001",
        first_name="John", last_name="Doe", date_of_birth=date(1990, 1, 1),
        created_by=1,
    )
    patient_a2 = Patient(
        id=2, tenant_id=1, medical_record_number="MRN-A002",
        first_name="Jane", last_name="Smith", date_of_birth=date(1985, 5, 15),
        created_by=1,
    )
    patient_b1 = Patient(
        id=3, tenant_id=2, medical_record_number="MRN-B001",
        first_name="Bob", last_name="Jones", date_of_birth=date(1975, 3, 20),
        created_by=3,
    )
    db_session.add_all([patient_a1, patient_a2, patient_b1])
    await db_session.flush()

    apt_a1 = Appointment(
        id=1, tenant_id=1, patient_id=1, doctor_id=1, receptionist_id=1,
        scheduled_at=now, duration_minutes=30, status="scheduled",
    )
    apt_a2 = Appointment(
        id=2, tenant_id=1, patient_id=2, doctor_id=1, receptionist_id=1,
        scheduled_at=now, duration_minutes=30, status="completed",
    )
    apt_b1 = Appointment(
        id=3, tenant_id=2, patient_id=3, doctor_id=None, receptionist_id=3,
        scheduled_at=now, duration_minutes=30, status="scheduled",
    )
    db_session.add_all([apt_a1, apt_a2, apt_b1])
    await db_session.flush()

    return {
        "tenant_a": tenant_a,
        "tenant_b": tenant_b,
        "doctor_a_user": doctor_user_a,
        "assistant_a_user": assistant_user_a,
        "doctor_b_user": doctor_user_b,
        "doctor_a": doctor_a,
        "patients": {"a1": patient_a1, "a2": patient_a2, "b1": patient_b1},
        "appointments": {"a1": apt_a1, "a2": apt_a2, "b1": apt_b1},
    }
