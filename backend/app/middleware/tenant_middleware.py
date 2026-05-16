from fastapi import Request, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import load_only
from app.core.database import get_db
from app.models.tenant import Tenant
from app.models.user import User


async def get_current_tenant(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Tenant:
    cached_tenant: Tenant | None = getattr(request.state, "tenant", None)
    if cached_tenant is not None:
        return cached_tenant

    user: User | None = getattr(request.state, "user", None)
    if not user or not user.tenant_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    result = await db.execute(
        select(Tenant)
        .options(load_only(Tenant.id, Tenant.name, Tenant.slug, Tenant.is_active))
        .where(Tenant.id == user.tenant_id)
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    request.state.tenant = tenant
    return tenant
