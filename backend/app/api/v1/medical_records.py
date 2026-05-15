from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from app.core.database import get_db
from app.middleware.auth_middleware import get_current_user, require_role
from app.middleware.tenant_middleware import get_current_tenant
from app.models.tenant import Tenant
from app.models.user import User
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.appointment import Appointment
from app.models.medical_record import MedicalRecord
from app.schemas.medical_record import MedicalRecordCreate, MedicalRecordUpdate, MedicalRecordResponse

router = APIRouter()


@router.post("/", response_model=MedicalRecordResponse, status_code=201)
async def create_medical_record(
    data: MedicalRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
    tenant: Tenant = Depends(get_current_tenant),
):
    doctor_result = await db.execute(
        select(Doctor).where(Doctor.user_id == current_user.id, Doctor.tenant_id == tenant.id)
    )
    doctor = doctor_result.scalar_one_or_none()

    patient_id: int | None = None
    doctor_id: int | None = None
    if data.appointment_id:
        appt_result = await db.execute(
            select(Appointment).options(joinedload(Appointment.patient)).where(
                Appointment.id == data.appointment_id,
                Appointment.tenant_id == tenant.id,
            )
        )
        appointment = appt_result.scalar_one_or_none()
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        patient_id = appointment.patient_id
        appointment.status = "completed"
        doctor_id = appointment.doctor_id or (doctor.id if doctor else None)
    elif data.patient_id:
        patient_id = data.patient_id
    else:
        raise HTTPException(status_code=400, detail="Either appointment_id or patient_id is required")

    if not doctor_id:
        doctor_id = doctor.id if doctor else None

    record = MedicalRecord(
        tenant_id=tenant.id,
        patient_id=patient_id,
        appointment_id=data.appointment_id,
        doctor_id=doctor_id,
        diagnosis=data.diagnosis,
        symptoms=data.symptoms,
        visit_notes=data.visit_notes,
    )
    db.add(record)
    await db.flush()

    return await _format_record(record, db)


@router.get("/patient/{patient_id}", response_model=list[MedicalRecordResponse])
async def get_patient_records(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
    tenant: Tenant = Depends(get_current_tenant),
):
    result = await db.execute(
        select(MedicalRecord)
        .options(joinedload(MedicalRecord.doctor).joinedload(Doctor.user), joinedload(MedicalRecord.appointment))
        .where(
            MedicalRecord.tenant_id == tenant.id,
            MedicalRecord.patient_id == patient_id,
        )
        .order_by(MedicalRecord.created_at.desc())
    )
    records = result.scalars().unique().all()
    return [_format_record_sync(r) for r in records]


@router.get("/{record_id}", response_model=MedicalRecordResponse)
async def get_medical_record(
    record_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
    tenant: Tenant = Depends(get_current_tenant),
):
    result = await db.execute(
        select(MedicalRecord)
        .options(joinedload(MedicalRecord.doctor).joinedload(Doctor.user), joinedload(MedicalRecord.appointment))
        .where(MedicalRecord.id == record_id, MedicalRecord.tenant_id == tenant.id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")
    return _format_record_sync(record)


@router.put("/{record_id}", response_model=MedicalRecordResponse)
async def update_medical_record(
    record_id: int,
    data: MedicalRecordUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor")),
    tenant: Tenant = Depends(get_current_tenant),
):
    result = await db.execute(
        select(MedicalRecord).where(MedicalRecord.id == record_id, MedicalRecord.tenant_id == tenant.id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(record, field, value)

    await db.flush()
    return await _format_record(record, db)


async def _format_record(record: MedicalRecord, db: AsyncSession) -> MedicalRecordResponse:
    resp = MedicalRecordResponse.model_validate(record)
    doctor_result = await db.execute(
        select(Doctor).options(joinedload(Doctor.user)).where(Doctor.id == record.doctor_id)
    )
    doctor = doctor_result.scalar_one_or_none()
    if doctor and doctor.user:
        resp.doctor_name = doctor.user.full_name
    if record.appointment:
        resp.appointment_date = record.appointment.scheduled_at
    return resp


def _format_record_sync(record: MedicalRecord) -> MedicalRecordResponse:
    resp = MedicalRecordResponse.model_validate(record)
    if record.doctor and record.doctor.user:
        resp.doctor_name = record.doctor.user.full_name
    if record.appointment:
        resp.appointment_date = record.appointment.scheduled_at
    return resp
