from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import load_only
from app.core.database import get_db
from app.core.security import hash_password
from app.middleware.auth_middleware import require_role
from app.middleware.tenant_middleware import get_current_tenant
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse

router = APIRouter()


@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor")),
    tenant: Tenant = Depends(get_current_tenant),
):
    result = await db.execute(
        select(User).where(User.tenant_id == tenant.id, User.email == data.email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already exists in this clinic")

    user = User(
        tenant_id=tenant.id,
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role=data.role,
        phone=data.phone,
    )
    db.add(user)
    await db.flush()
    return user


@router.get("/", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
):
    result = await db.execute(
        select(User)
        .options(
            load_only(
                User.id,
                User.tenant_id,
                User.email,
                User.full_name,
                User.role,
                User.phone,
                User.is_active,
                User.created_at,
            )
        )
        .where(User.tenant_id == current_user.tenant_id)
        .order_by(User.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
    tenant: Tenant = Depends(get_current_tenant),
):
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == tenant.id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor")),
    tenant: Tenant = Depends(get_current_tenant),
):
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == tenant.id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.full_name is not None:
        user.full_name = data.full_name
    if data.phone is not None:
        user.phone = data.phone
    if data.role is not None:
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active

    await db.flush()
    return user
