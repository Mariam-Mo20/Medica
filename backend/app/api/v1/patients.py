from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, load_only
from time import perf_counter
from app.core.config import settings
from app.core.database import get_db
from app.middleware.auth_middleware import require_role
from app.middleware.tenant_middleware import get_current_tenant
from app.models.tenant import Tenant
from app.models.user import User
from app.models.patient import Patient
from app.models.appointment import Appointment
from app.schemas.patient import PatientCreate, PatientUpdate, PatientResponse, PatientSearchResult
from app.services.patient_service import generate_mrn

router = APIRouter()


async def _get_patient_or_404(db: AsyncSession, patient_id: int, tenant_id: int) -> Patient:
    result = await db.execute(
        select(Patient).where(Patient.id == patient_id, Patient.tenant_id == tenant_id)
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.post("/", response_model=PatientResponse, status_code=201)
async def create_patient(
    data: PatientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
    tenant: Tenant = Depends(get_current_tenant),
):
    mrn = await generate_mrn(db, tenant.id)
    patient = Patient(
        tenant_id=tenant.id,
        medical_record_number=mrn,
        first_name=data.first_name,
        last_name=data.last_name,
        date_of_birth=data.date_of_birth,
        gender=data.gender,
        phone=data.phone,
        email=data.email,
        address=data.address,
        created_by=current_user.id,
    )
    db.add(patient)
    await db.flush()
    return patient


@router.get("/", response_model=list[PatientResponse])
async def list_patients(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    handler_started_at = perf_counter()

    query_started_at = perf_counter()
    result = await db.execute(
        select(Patient)
        .options(
            load_only(
                Patient.id,
                Patient.tenant_id,
                Patient.medical_record_number,
                Patient.first_name,
                Patient.last_name,
                Patient.date_of_birth,
                Patient.gender,
                Patient.phone,
                Patient.email,
                Patient.address,
                Patient.is_active,
                Patient.created_at,
                Patient.updated_at,
            )
        )
        .where(Patient.tenant_id == current_user.tenant_id)
        .order_by(Patient.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    patients = result.scalars().all()
    query_ms = (perf_counter() - query_started_at) * 1000

    serialize_started_at = perf_counter()
    payload = [PatientResponse.model_validate(p) for p in patients]
    serialize_ms = (perf_counter() - serialize_started_at) * 1000

    handler_ms = (perf_counter() - handler_started_at) * 1000
    if settings.DEBUG:
        print(
            f"[perf][patients] list query={query_ms:.1f}ms serialize={serialize_ms:.1f}ms "
            f"handler={handler_ms:.1f}ms rows={len(payload)}"
        )

    return payload


@router.get("/search", response_model=list[PatientSearchResult])
async def search_patients(
    q: str = Query(min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
):
    term = f"%{q}%"
    latest_visit = (
        select(
            Appointment.patient_id.label("patient_id"),
            func.max(Appointment.scheduled_at).label("last_visit_at"),
        )
        .where(Appointment.tenant_id == current_user.tenant_id)
        .group_by(Appointment.patient_id)
        .subquery()
    )
    latest_appointment = aliased(Appointment)

    result = await db.execute(
        select(
            Patient.id,
            Patient.medical_record_number,
            Patient.first_name,
            Patient.last_name,
            Patient.phone,
            Patient.date_of_birth,
            latest_visit.c.last_visit_at,
            latest_appointment.reason,
        )
        .outerjoin(latest_visit, latest_visit.c.patient_id == Patient.id)
        .outerjoin(
            latest_appointment,
            (latest_appointment.patient_id == Patient.id)
            & (latest_appointment.scheduled_at == latest_visit.c.last_visit_at)
            & (latest_appointment.tenant_id == current_user.tenant_id),
        )
        .where(
            Patient.tenant_id == current_user.tenant_id,
            or_(
                Patient.first_name.ilike(term),
                Patient.last_name.ilike(term),
                Patient.medical_record_number.ilike(term),
                Patient.phone.ilike(term),
            ),
        )
        .order_by(Patient.first_name.asc(), Patient.last_name.asc())
        .limit(20)
    )

    rows = result.all()
    return [
        PatientSearchResult(
            id=row.id,
            medical_record_number=row.medical_record_number,
            first_name=row.first_name,
            last_name=row.last_name,
            phone=row.phone,
            date_of_birth=row.date_of_birth,
            last_visit_at=row.last_visit_at,
            last_visit_type=(
                "Follow-up"
                if row.reason and "follow" in row.reason.lower()
                else ("Consultation" if row.last_visit_at else None)
            ),
        )
        for row in rows
    ]


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
    tenant: Tenant = Depends(get_current_tenant),
):
    return await _get_patient_or_404(db, patient_id, tenant.id)


@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: int,
    data: PatientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
    tenant: Tenant = Depends(get_current_tenant),
):
    patient = await _get_patient_or_404(db, patient_id, tenant.id)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(patient, field, value)

    await db.flush()
    return patient
