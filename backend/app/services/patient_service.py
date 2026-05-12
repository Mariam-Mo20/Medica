from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.patient import Patient


async def generate_mrn(db: AsyncSession, tenant_id: int) -> str:
    result = await db.execute(
        select(func.count(Patient.id)).where(Patient.tenant_id == tenant_id)
    )
    count = result.scalar() or 0
    return f"MRC-{tenant_id:04d}-{count + 1:05d}"
