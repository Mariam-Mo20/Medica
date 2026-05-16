from time import time
from fastapi import Request, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import load_only
from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User

_USER_CACHE_TTL = 10  # seconds — intentional stale window; role/active changes propagate within this bound
_user_cache: dict[int, tuple[User, float]] = {}

def _get_cached_user(user_id: int) -> User | None:
    entry = _user_cache.get(user_id)
    if entry and entry[1] > time():
        return entry[0]
    return None

def _set_cached_user(user: User):
    _user_cache[user.id] = (user, time() + _USER_CACHE_TTL)


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    cached = getattr(request.state, "user", None)
    if cached is not None:
        return cached

    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = auth_header.split(" ")[1]
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    cached_user = _get_cached_user(user_id)
    if cached_user is not None:
        request.state.user = cached_user
        return cached_user

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
            )
        )
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    _set_cached_user(user)
    request.state.user = user
    return user


def require_role(*roles: str):
    async def role_checker(request: Request, user: User = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker
