from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.middleware.auth_middleware import require_role
from app.middleware.tenant_middleware import get_current_tenant
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantResponse

router = APIRouter()


@router.post("/", response_model=TenantResponse, status_code=201)
async def create_tenant(
    data: TenantCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(require_role("doctor")),
):
    result = await db.execute(select(Tenant).where(Tenant.slug == data.slug))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Tenant slug already exists")

    tenant = Tenant(name=data.name, slug=data.slug, settings=data.settings or {})
    db.add(tenant)
    await db.flush()
    return tenant


@router.get("/", response_model=list[TenantResponse])
async def list_tenants(current_tenant: Tenant = Depends(get_current_tenant)):
    return [current_tenant]


@router.get("/{tenant_id}", response_model=TenantResponse)
async def get_tenant(tenant_id: int, current_tenant: Tenant = Depends(get_current_tenant)):
    if tenant_id != current_tenant.id:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return current_tenant


@router.put("/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: int,
    data: TenantUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(require_role("doctor")),
    current_tenant: Tenant = Depends(get_current_tenant),
):
    if tenant_id != current_tenant.id:
        raise HTTPException(status_code=404, detail="Tenant not found")

    tenant = current_tenant

    if data.name is not None:
        tenant.name = data.name
    if data.settings is not None:
        tenant.settings = data.settings
    if data.is_active is not None:
        tenant.is_active = data.is_active

    await db.flush()
    return tenant
