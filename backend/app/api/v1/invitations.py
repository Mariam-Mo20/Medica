import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from app.core.database import get_db
from app.middleware.auth_middleware import get_current_user, require_role
from app.middleware.tenant_middleware import get_current_tenant
from app.models.tenant import Tenant
from app.models.user import User
from app.models.invitation import Invitation
from app.schemas.invitation import InvitationCreate, InvitationResponse, InvitationCheckResponse

router = APIRouter()


@router.get("/check")
async def check_invitation(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Invitation).where(
            Invitation.token == token,
            Invitation.status == "pending",
        )
    )
    invitation = result.scalar_one_or_none()
    if not invitation:
        return InvitationCheckResponse(valid=False, message="Invalid or expired invitation token")
    if invitation.expires_at < datetime.now(timezone.utc):
        return InvitationCheckResponse(valid=False, message="Invitation token has expired")
    return InvitationCheckResponse(
        valid=True,
        email=invitation.email,
        role=invitation.role,
    )


@router.post("/", response_model=InvitationResponse, status_code=201)
async def create_invitation(
    data: InvitationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor")),
    tenant: Tenant = Depends(get_current_tenant),
):
    if data.email:
        existing = await db.execute(
            select(Invitation).where(
                Invitation.clinic_id == tenant.id,
                Invitation.email == data.email,
                Invitation.status == "pending",
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Pending invitation already exists for this email")

    token = secrets.token_urlsafe(32)
    invitation = Invitation(
        clinic_id=tenant.id,
        doctor_id=current_user.id,
        email=data.email,
        role=data.role,
        token=token,
        status="pending",
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(invitation)
    await db.flush()

    resp = InvitationResponse.model_validate(invitation)
    resp.doctor_name = current_user.full_name
    return resp


@router.get("/", response_model=list[InvitationResponse])
async def list_invitations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor")),
    tenant: Tenant = Depends(get_current_tenant),
):
    result = await db.execute(
        select(Invitation)
        .options(joinedload(Invitation.doctor))
        .where(Invitation.clinic_id == tenant.id)
        .order_by(Invitation.created_at.desc())
    )
    invitations = result.scalars().unique().all()
    output = []
    for inv in invitations:
        resp = InvitationResponse.model_validate(inv)
        if inv.doctor:
            resp.doctor_name = inv.doctor.full_name
        output.append(resp)
    return output


@router.delete("/{invitation_id}")
async def delete_invitation(
    invitation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor")),
    tenant: Tenant = Depends(get_current_tenant),
):
    result = await db.execute(
        select(Invitation).where(
            Invitation.id == invitation_id,
            Invitation.clinic_id == tenant.id,
        )
    )
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    await db.delete(invitation)
    await db.flush()
    return {"message": "Invitation deleted"}
