import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "Pastoral Missionária" in data["pastoral"]
    assert "São Padre Pio" in data["patron"]

def test_calendar_events_2027():
    response = client.get("/api/v1/calendar/events?year=2027")
    assert response.status_code == 200
    events = response.json()
    assert len(events) >= 26
    # Verify no canceled events
    for ev in events:
        assert ev["status"] != "Cancelado"

def test_calendar_next_event():
    response = client.get("/api/v1/calendar/next-event")
    assert response.status_code == 200
    event = response.json()
    assert event is not None
    assert "title" in event
    assert "event_date" in event

def test_labs_themes():
    response = client.get("/api/v1/labs/")
    assert response.status_code == 200
    data = response.json()
    assert "themes" in data
    assert len(data["themes"]) >= 19

def test_orders_security_unauthorized_blocked():
    # Negative security test: Unauthenticated request to list all orders MUST fail
    response = client.get("/api/v1/orders/")
    assert response.status_code in [401, 403]

def test_google_auth_and_onboarding():
    # New user logging in via Google
    response = client.post("/api/v1/auth/google", json={
        "email": "novo.missionario.teste@gmail.com",
        "name": "Missionário Teste",
        "picture": "https://example.com/avatar.png",
        "google_id": "google_sub_123456"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "novo.missionario.teste@gmail.com"
    assert data["user"]["role"] == "pendente"
    assert data["needs_onboarding"] is True

