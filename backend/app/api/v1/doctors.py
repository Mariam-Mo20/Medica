from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from app.core.database import get_db
from app.middleware.auth_middleware import get_current_user, require_role
from app.middleware.tenant_middleware import get_current_tenant
from app.models.tenant import Tenant
from app.models.user import User
from app.models.doctor import Doctor
from app.schemas.doctor import DoctorCreate, DoctorUpdate, DoctorResponse

router = APIRouter()


@router.post("/", response_model=DoctorResponse, status_code=201)
async def create_doctor(
    data: DoctorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor")),
    tenant: Tenant = Depends(get_current_tenant),
):
    user_result = await db.execute(
        select(User).where(User.id == data.user_id, User.tenant_id == tenant.id)
    )
    if not user_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="User not found in this clinic")

    doctor = Doctor(
        tenant_id=tenant.id,
        user_id=data.user_id,
        specialization=data.specialization,
        license_number=data.license_number,
        schedule=data.schedule or {},
    )
    db.add(doctor)
    await db.flush()
    return await _format_doctor(doctor, db)


@router.get("/", response_model=list[DoctorResponse])
async def list_doctors(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
    tenant: Tenant = Depends(get_current_tenant),
):
    result = await db.execute(
        select(Doctor)
        .options(joinedload(Doctor.user))
        .where(Doctor.tenant_id == tenant.id)
        .order_by(Doctor.created_at.desc())
    )
    doctors = result.scalars().unique().all()
    return [_format_doctor_sync(d) for d in doctors]


@router.get("/me", response_model=DoctorResponse)
async def get_my_doctor_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
    tenant: Tenant = Depends(get_current_tenant),
):
    result = await db.execute(
        select(Doctor)
        .options(joinedload(Doctor.user))
        .where(Doctor.user_id == current_user.id, Doctor.tenant_id == tenant.id)
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found for current user")
    return _format_doctor_sync(doctor)


@router.get("/{doctor_id}", response_model=DoctorResponse)
async def get_doctor(
    doctor_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
    tenant: Tenant = Depends(get_current_tenant),
):
    result = await db.execute(
        select(Doctor)
        .options(joinedload(Doctor.user))
        .where(Doctor.id == doctor_id, Doctor.tenant_id == tenant.id)
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return _format_doctor_sync(doctor)


@router.put("/{doctor_id}", response_model=DoctorResponse)
async def update_doctor(
    doctor_id: int,
    data: DoctorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor")),
    tenant: Tenant = Depends(get_current_tenant),
):
    result = await db.execute(
        select(Doctor).where(Doctor.id == doctor_id, Doctor.tenant_id == tenant.id)
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    if data.specialization is not None:
        doctor.specialization = data.specialization
    if data.license_number is not None:
        doctor.license_number = data.license_number
    if data.schedule is not None:
        doctor.schedule = data.schedule

    await db.flush()
    return await _format_doctor(doctor, db)


async def _format_doctor(doctor: Doctor, db: AsyncSession) -> DoctorResponse:
    resp = DoctorResponse.model_validate(doctor)
    user_result = await db.execute(select(User).where(User.id == doctor.user_id))
    user = user_result.scalar_one_or_none()
    if user:
        resp.full_name = user.full_name
        resp.email = user.email
    return resp


def _format_doctor_sync(doctor: Doctor) -> DoctorResponse:
    resp = DoctorResponse.model_validate(doctor)
    if doctor.user:
        resp.full_name = doctor.user.full_name
        resp.email = doctor.user.email
    return resp
