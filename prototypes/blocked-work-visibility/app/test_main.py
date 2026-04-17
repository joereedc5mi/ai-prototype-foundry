from fastapi.testclient import TestClient
from main import app, items, Status

client = TestClient(app)

def test_create_item():
    # Clear items for testing
    items.clear()
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

def test_update_status_to_in_progress():
    # Ensure there is an item
    items.clear()
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

def test_get_items():
    response = client.get("/api/blocked")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
