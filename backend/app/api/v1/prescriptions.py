from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from app.core.database import get_db
from app.middleware.auth_middleware import get_current_user, require_role
from app.middleware.tenant_middleware import get_current_tenant
from app.models.tenant import Tenant
from app.models.user import User
from app.models.doctor import Doctor
from app.models.medical_record import MedicalRecord
from app.models.prescription import Prescription
from app.schemas.prescription import PrescriptionCreate, PrescriptionResponse, PrescriptionUpdate

router = APIRouter()


class MedicationSuggestionResponse(BaseModel):
    medication_name: str
    usage_count: int


@router.post("/medical-record/{record_id}", response_model=list[PrescriptionResponse], status_code=201)
async def add_prescriptions(
    record_id: int,
    prescriptions: list[PrescriptionCreate],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
    tenant: Tenant = Depends(get_current_tenant),
):
    doctor_result = await db.execute(
        select(Doctor).where(Doctor.user_id == current_user.id, Doctor.tenant_id == tenant.id)
    )
    doctor = doctor_result.scalar_one_or_none()

    record_result = await db.execute(
        select(MedicalRecord).where(MedicalRecord.id == record_id, MedicalRecord.tenant_id == tenant.id)
    )
    record = record_result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")

    doctor_id = doctor.id if doctor else record.doctor_id

    created = []
    for p in prescriptions:
        prescription = Prescription(
            tenant_id=tenant.id,
            medical_record_id=record_id,
            doctor_id=doctor_id,
            medication_name=p.medication_name,
            dosage=p.dosage,
            frequency=p.frequency,
            duration=p.duration,
            instructions=p.instructions,
        )
        db.add(prescription)
        created.append(prescription)

    await db.flush()

    result = []
    for p in created:
        resp = PrescriptionResponse.model_validate(p)
        if doctor:
            resp.doctor_name = current_user.full_name
        result.append(resp)
    return result


@router.get("/medical-record/{record_id}", response_model=list[PrescriptionResponse])
async def get_prescriptions(
    record_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
    tenant: Tenant = Depends(get_current_tenant),
):
    result = await db.execute(
        select(Prescription)
        .options(joinedload(Prescription.doctor).joinedload(Doctor.user))
        .where(Prescription.medical_record_id == record_id, Prescription.tenant_id == tenant.id)
        .order_by(Prescription.created_at.desc())
    )
    prescriptions = result.scalars().unique().all()
    output = []
    for p in prescriptions:
        resp = PrescriptionResponse.model_validate(p)
        if p.doctor and p.doctor.user:
            resp.doctor_name = p.doctor.user.full_name
        output.append(resp)
    return output


@router.get("/suggestions", response_model=list[MedicationSuggestionResponse])
async def get_medication_suggestions(
    q: str = Query(min_length=1),
    limit: int = Query(8, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
    tenant: Tenant = Depends(get_current_tenant),
):
    term = f"%{q.strip()}%"
    result = await db.execute(
        select(
            Prescription.medication_name,
            func.count(Prescription.id).label("usage_count"),
        )
        .where(
            Prescription.tenant_id == tenant.id,
            Prescription.medication_name.ilike(term),
        )
        .group_by(Prescription.medication_name)
        .order_by(func.count(Prescription.id).desc(), Prescription.medication_name.asc())
        .limit(limit)
    )
    rows = result.all()
    return [
        MedicationSuggestionResponse(
            medication_name=row.medication_name,
            usage_count=row.usage_count,
        )
        for row in rows
    ]


@router.put("/{prescription_id}", response_model=PrescriptionResponse)
async def update_prescription(
    prescription_id: int,
    data: PrescriptionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
    tenant: Tenant = Depends(get_current_tenant),
):
    result = await db.execute(
        select(Prescription)
        .options(joinedload(Prescription.doctor).joinedload(Doctor.user))
        .where(Prescription.id == prescription_id, Prescription.tenant_id == tenant.id)
    )
    prescription = result.scalar_one_or_none()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(prescription, field, value)

    await db.flush()

    resp = PrescriptionResponse.model_validate(prescription)
    if prescription.doctor and prescription.doctor.user:
        resp.doctor_name = prescription.doctor.user.full_name
    return resp
