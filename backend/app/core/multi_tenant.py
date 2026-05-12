from fastapi import Request, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.tenant import Tenant


async def get_tenant_from_request(request: Request, db: AsyncSession = Depends(get_db)) -> Tenant:
    tenant_slug = request.headers.get("X-Tenant-Slug")
    if not tenant_slug:
        raise HTTPException(status_code=400, detail="X-Tenant-Slug header is required")

    result = await db.execute(select(Tenant).where(Tenant.slug == tenant_slug, Tenant.is_active == True))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found or inactive")

    request.state.tenant = tenant
    return tenant
