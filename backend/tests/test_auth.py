import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone
from app.middleware.auth_middleware import _get_cached_user, _set_cached_user, _USER_CACHE_TTL
from app.models.user import User
from app.core.security import hash_password, create_access_token, decode_token


class TestUserCache:
    def test_set_and_get_cached_user(self):
        user = User(
            id=99, tenant_id=1, email="test@test.com",
            full_name="Test User", role="doctor", is_active=True,
        )
        _set_cached_user(user)
        cached = _get_cached_user(99)
        assert cached is not None
        assert cached.id == 99
        assert cached.role == "doctor"

    def test_miss_returns_none(self):
        cached = _get_cached_user(99999)
        assert cached is None

    def test_expired_entry_returns_none(self):
        from app.middleware.auth_middleware import _user_cache
        import time

        user = User(
            id=100, tenant_id=1, email="test2@test.com",
            full_name="Test User 2", role="assistant", is_active=True,
        )
        _user_cache[100] = (user, time.time() - 1)
        cached = _get_cached_user(100)
        assert cached is None


class TestToken:
    def test_create_and_decode_token(self):
        token = create_access_token(data={"sub": "1"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "1"
        assert payload["type"] == "access"

    def test_decode_expired_token(self):
        from datetime import timedelta
        token = create_access_token(data={"sub": "1"}, expires_delta=timedelta(days=-1))
        payload = decode_token(token)
        assert payload is None

    def test_decode_invalid_token(self):
        payload = decode_token("invalid.token.here")
        assert payload is None


class TestPassword:
    def test_hash_and_verify(self):
        password = "my_secret_pass"
        hashed = hash_password(password)
        assert hashed != password
        assert len(hashed) > 10
