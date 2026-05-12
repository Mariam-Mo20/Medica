import re
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.middleware.auth_middleware import get_current_user
from app.middleware.tenant_middleware import get_current_tenant
from app.models.tenant import Tenant
from app.models.user import User
from app.models.invitation import Invitation
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, RefreshRequest, AuthUser, MeResponse

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if data.role not in ("doctor", "assistant"):
        raise HTTPException(status_code=400, detail="Role must be 'doctor' or 'assistant'")

    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    if data.clinic_name:
        if data.role != "doctor":
            raise HTTPException(status_code=400, detail="Only doctors can create clinics")

        slug = re.sub(r"[^a-z0-9-]", "", data.clinic_name.lower().replace(" ", "-"))[:80]
        if not slug:
            slug = "clinic"

        existing_slug = await db.execute(select(Tenant).where(Tenant.slug == slug))
        if existing_slug.scalar_one_or_none():
            slug = f"{slug}-{secrets.token_hex(4)}"

        tenant = Tenant(name=data.clinic_name, slug=slug, settings={})
        db.add(tenant)
        await db.flush()
        tenant_id = tenant.id
        role = data.role
    elif data.invitation_token:
        inv_result = await db.execute(
            select(Invitation).where(
                Invitation.token == data.invitation_token,
                Invitation.status == "pending",
            )
        )
        invitation = inv_result.scalar_one_or_none()
        if not invitation:
            raise HTTPException(status_code=400, detail="Invalid or expired invitation token")
        if invitation.expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Invitation token has expired")
        if invitation.email and invitation.email != data.email:
            raise HTTPException(status_code=400, detail="Email does not match invitation")
        tenant_id = invitation.clinic_id
        role = invitation.role
    else:
        raise HTTPException(status_code=400, detail="Clinic name or invitation token is required")

    user = User(
        tenant_id=tenant_id,
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role=role,
        phone=data.phone,
    )
    db.add(user)
    await db.flush()

    if data.invitation_token and invitation:
        invitation.status = "accepted"
        invitation.accepted_at = datetime.now(timezone.utc)

    access_token = create_access_token({"sub": str(user.id), "tenant_id": tenant_id, "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    access_token = create_access_token({"sub": str(user.id), "tenant_id": user.tenant_id, "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    access_token = create_access_token({"sub": str(user.id), "tenant_id": user.tenant_id, "role": user.role})
    new_refresh_token = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(access_token=access_token, refresh_token=new_refresh_token)


@router.get("/me", response_model=MeResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
):
    return MeResponse(
        user=AuthUser(
            id=current_user.id,
            email=current_user.email,
            full_name=current_user.full_name,
            role=current_user.role,
            tenant_id=current_user.tenant_id,
            tenant_slug=tenant.slug,
            tenant_name=tenant.name,
        )
    )
