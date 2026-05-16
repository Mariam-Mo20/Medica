import pytest
from fastapi.testclient import TestClient
from app.core.security import create_access_token


def test_health_endpoint():
    from app.main import app
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_auth_login_rejects_invalid_credentials():
    from app.main import app
    client = TestClient(app)
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@test.com", "password": "wrong"},
    )
    assert response.status_code == 401


def test_auth_me_without_token_returns_401():
    from app.main import app
    client = TestClient(app)
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_patients_list_without_token_returns_401():
    from app.main import app
    client = TestClient(app)
    response = client.get("/api/v1/patients/")
    assert response.status_code == 401


def test_appointments_list_without_token_returns_401():
    from app.main import app
    client = TestClient(app)
    response = client.get("/api/v1/appointments/")
    assert response.status_code == 401


def test_users_list_without_token_returns_401():
    from app.main import app
    client = TestClient(app)
    response = client.get("/api/v1/users/")
    assert response.status_code == 401


def test_dashboard_without_token_returns_401():
    from app.main import app
    client = TestClient(app)
    response = client.get("/api/v1/dashboard/")
    assert response.status_code == 401


def test_invalid_token_returns_401():
    from app.main import app
    client = TestClient(app)
    response = client.get(
        "/api/v1/patients/",
        headers={"Authorization": "Bearer invalid_token_here"},
    )
    assert response.status_code == 401
