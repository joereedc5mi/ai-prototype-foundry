import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool
from main import app, get_session, Status

# Setup for testing
@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session

@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session
    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()

def test_create_item(client: TestClient):
    payload = {
        "title": "Test Blocker",
        "description": "Testing description",
        "waiting_on": "External Team",
        "owner": "Jules"
    }
    response = client.post("/api/blocked", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Blocker"
    assert data["status"] == "blocked"
    assert "id" in data

def test_update_status_to_in_progress(client: TestClient):
    payload = {
        "title": "Test Blocker",
        "description": "Testing description",
        "waiting_on": "External Team",
        "owner": "Jules"
    }
    create_res = client.post("/api/blocked", json=payload)
    item_id = create_res.json()["id"]

    update_payload = {
        "status": "in_progress",
        "reason": "Starting work now"
    }
    response = client.patch(f"/api/blocked/{item_id}", json=update_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "in_progress"
    assert any("In Progress: Starting work now" in note["text"] for note in data["update_notes"])

def test_get_items(client: TestClient):
    response = client.get("/api/blocked")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
