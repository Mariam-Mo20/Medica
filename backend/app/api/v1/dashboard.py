from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.middleware.auth_middleware import require_role
from app.models.user import User
from app.schemas.dashboard import DashboardStats
from app.services.dashboard_service import get_dashboard_stats

router = APIRouter()


@router.get("/", response_model=DashboardStats)
async def dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "assistant")),
):
    return await get_dashboard_stats(db, current_user.tenant_id)
