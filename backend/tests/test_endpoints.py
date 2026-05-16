import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from app.core.security import create_access_token
from app.core.database import get_db
from app.main import app as _app


@pytest_asyncio.fixture
async def authed_client(db_session, seed_data):
    _app.dependency_overrides.clear()

    async def _override_db():
        yield db_session

    _app.dependency_overrides[get_db] = _override_db

    doctor_user = seed_data["doctor_a_user"]
    assistant_user = seed_data["assistant_a_user"]
    doctor_b_user = seed_data["doctor_b_user"]

    doctor_token = create_access_token(data={"sub": str(doctor_user.id)})
    assistant_token = create_access_token(data={"sub": str(assistant_user.id)})
    doctor_b_token = create_access_token(data={"sub": str(doctor_b_user.id)})

    client = TestClient(_app)
    yield client, doctor_token, assistant_token, doctor_b_token, seed_data

    _app.dependency_overrides.clear()


class TestCrossTenantIsolation:
    @pytest.mark.asyncio
    async def test_tenant_a_cannot_read_tenant_b_patients(self, authed_client):
        client, token, _, _, seed = authed_client
        resp = client.get(
            "/api/v1/patients/?limit=100",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        mrns = {p["medical_record_number"] for p in data}
        assert "MRN-A001" in mrns
        assert "MRN-A002" in mrns
        assert "MRN-B001" not in mrns

    @pytest.mark.asyncio
    async def test_tenant_b_cannot_read_tenant_a_patients(self, authed_client):
        client, _, _, token_b, seed = authed_client
        resp = client.get(
            "/api/v1/patients/?limit=100",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        mrns = {p["medical_record_number"] for p in data}
        assert "MRN-B001" in mrns
        assert "MRN-A001" not in mrns
        assert "MRN-A002" not in mrns

    @pytest.mark.asyncio
    async def test_tenant_b_cannot_read_tenant_a_appointments(self, authed_client):
        client, _, _, token_b, seed = authed_client
        resp = client.get(
            "/api/v1/appointments/?limit=100",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        for apt in data:
            assert apt["patient_name"] == "Bob Jones"


class TestLoginFlow:
    @pytest.mark.asyncio
    async def test_login_returns_token(self, authed_client):
        client, _, _, _, _ = authed_client
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "doctor@alpha.com", "password": "pass"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert "refresh_token" in body

    @pytest.mark.asyncio
    async def test_token_works_on_protected_endpoints(self, authed_client):
        client, token, _, _, _ = authed_client
        for path in [
            "/api/v1/dashboard/",
            "/api/v1/patients/?limit=10",
            "/api/v1/appointments/?limit=10",
            "/api/v1/users/",
        ]:
            resp = client.get(path, headers={"Authorization": f"Bearer {token}"})
            assert resp.status_code == 200, f"{path} returned {resp.status_code}"


class TestRoleGating:
    @pytest.mark.asyncio
    async def test_assistant_cannot_create_user(self, authed_client):
        client, _, assistant_token, _, _ = authed_client
        resp = client.post(
            "/api/v1/users/",
            headers={"Authorization": f"Bearer {assistant_token}"},
            json={
                "email": "new@test.com",
                "password": "test123",
                "full_name": "New User",
                "role": "assistant",
            },
        )
        assert resp.status_code == 403


class TestResponseShape:
    @pytest.mark.asyncio
    async def test_appointments_response_has_all_fields(self, authed_client):
        client, token, _, _, _ = authed_client
        resp = client.get(
            "/api/v1/appointments/?limit=10",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) > 0
        expected_fields = {
            "id", "tenant_id", "patient_id", "doctor_id", "receptionist_id",
            "scheduled_at", "duration_minutes", "status", "reason", "notes",
            "recurring_rule", "recurring_end_date", "series_id",
            "is_series_cancelled", "created_at", "updated_at",
            "patient_name", "doctor_name",
        }
        for apt in data:
            assert set(apt.keys()) == expected_fields, f"Missing fields: {expected_fields - set(apt.keys())}"
            assert isinstance(apt["patient_name"], str) and len(apt["patient_name"]) > 0

    @pytest.mark.asyncio
    async def test_users_list_omits_password_hash(self, authed_client):
        client, token, _, _, _ = authed_client
        resp = client.get(
            "/api/v1/users/",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) > 0
        for user in data:
            assert "password_hash" not in user

    @pytest.mark.asyncio
    async def test_dashboard_response_shape(self, authed_client):
        client, token, _, _, _ = authed_client
        resp = client.get(
            "/api/v1/dashboard/",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        required = {"total_patients", "patients_today", "today_appointments",
                     "completed_appointments", "new_patients_today",
                     "appointments_by_status", "recent_appointments"}
        assert required.issubset(data.keys())
        assert data["total_patients"] > 0


class TestPatientsSearch:
    @pytest.mark.asyncio
    async def test_search_returns_matching_patients(self, authed_client):
        client, token, _, _, _ = authed_client
        resp = client.get(
            "/api/v1/patients/search?q=John",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) > 0
        names = {f"{p['first_name']} {p['last_name']}" for p in data}
        assert "John Doe" in names

    @pytest.mark.asyncio
    async def test_search_returns_empty_for_no_match(self, authed_client):
        client, token, _, _, _ = authed_client
        resp = client.get(
            "/api/v1/patients/search?q=zzzznotfound",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data == []
