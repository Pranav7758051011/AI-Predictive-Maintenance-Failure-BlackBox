import pytest
from datetime import datetime, timezone, timedelta
from app.utils.constants import ProductType, MachineStatus

@pytest.fixture
def test_machine(client, admin_user):
    """Fixture that creates a standard machine for sensor telemetry tests."""
    payload = {
        "serial_number": "SENSOR-CNC-001",
        "name": "Telemetry Test Station",
        "product_type": ProductType.MEDIUM,
        "location": "Bay 12, Unit A",
        "status": MachineStatus.HEALTHY
    }
    res = client.post("/api/machines", json=payload, headers=admin_user["headers"])
    assert res.status_code == 201
    return res.get_json()["data"]

@pytest.fixture
def assigned_machine(client, admin_user, engineer_user):
    """Fixture that creates a machine assigned to engineer 1."""
    payload = {
        "serial_number": "ASSIGNED-CNC-002",
        "name": "Assigned Sensor Station",
        "product_type": ProductType.HIGH,
        "location": "Bay 14",
        "assigned_engineer_id": str(engineer_user["user"]["id"])
    }
    res = client.post("/api/machines", json=payload, headers=admin_user["headers"])
    assert res.status_code == 201
    return res.get_json()["data"]

def test_ingest_telemetry_success_admin(client, admin_user, test_machine):
    """Test Admin successfully ingesting a valid sensor telemetry record."""
    payload = {
        "air_temp": 298.1,
        "process_temp": 308.6,
        "rotational_speed": 1551.0,
        "torque": 42.8,
        "tool_wear": 120.0
    }
    url = f"/api/machines/{test_machine['id']}/sensors"
    response = client.post(url, json=payload, headers=admin_user["headers"])
    
    assert response.status_code == 201
    json_data = response.get_json()
    assert json_data["success"] is True
    data = json_data["data"]
    assert data["air_temp"] == 298.1
    assert data["process_temp"] == 308.6
    assert data["rotational_speed"] == 1551.0
    assert data["torque"] == 42.8
    assert data["tool_wear"] == 120.0
    assert data["product_type"] == ProductType.MEDIUM
    # Verify derived physics metrics (non-ML)
    assert data["temperature_difference"] == 10.5 # 308.6 - 298.1
    assert "power" in data
    assert "timestamp" in data
    assert "created_at" in data

def test_ingest_telemetry_success_assigned_engineer(client, engineer_user, assigned_machine):
    """Test Assigned Engineer successfully ingesting telemetry for assigned machine."""
    payload = {
        "air_temp": 300.0,
        "process_temp": 310.0,
        "rotational_speed": 1500.0,
        "torque": 40.0,
        "tool_wear": 10.0
    }
    url = f"/api/machines/{assigned_machine['id']}/sensors"
    response = client.post(url, json=payload, headers=engineer_user["headers"])
    assert response.status_code == 201
    assert response.get_json()["success"] is True

def test_ingest_telemetry_forbidden_unassigned_engineer(client, second_engineer_user, assigned_machine):
    """Test Engineer 2 forbidden (403) from ingesting telemetry for machine assigned to Engineer 1."""
    payload = {
        "air_temp": 300.0,
        "process_temp": 310.0,
        "rotational_speed": 1500.0,
        "torque": 40.0,
        "tool_wear": 10.0
    }
    url = f"/api/machines/{assigned_machine['id']}/sensors"
    response = client.post(url, json=payload, headers=second_engineer_user["headers"])
    assert response.status_code == 403
    assert response.get_json()["error_code"] == "MACHINE_ACCESS_DENIED"

def test_ingest_telemetry_forbidden_viewer(client, viewer_user, test_machine):
    """Test Viewer forbidden (403) from ingesting sensor data (read-only role)."""
    payload = {
        "air_temp": 298.1,
        "process_temp": 308.6,
        "rotational_speed": 1551.0,
        "torque": 42.8,
        "tool_wear": 120.0
    }
    url = f"/api/machines/{test_machine['id']}/sensors"
    response = client.post(url, json=payload, headers=viewer_user["headers"])
    assert response.status_code == 403
    assert response.get_json()["error_code"] == "FORBIDDEN"

def test_ingest_telemetry_unauthenticated(client, test_machine):
    """Test unauthenticated request returns 401 Unauthorized."""
    payload = {
        "air_temp": 298.1,
        "process_temp": 308.6,
        "rotational_speed": 1551.0,
        "torque": 42.8,
        "tool_wear": 120.0
    }
    url = f"/api/machines/{test_machine['id']}/sensors"
    response = client.post(url, json=payload)
    assert response.status_code == 401
    assert response.get_json()["error_code"] == "AUTHORIZATION_REQUIRED"

def test_ingest_telemetry_custom_timestamp(client, admin_user, test_machine):
    """Test preserving client-provided ISO timestamp when valid."""
    custom_ts = "2026-08-31T12:00:00Z"
    payload = {
        "air_temp": 299.0,
        "process_temp": 309.5,
        "rotational_speed": 1450.0,
        "torque": 45.0,
        "tool_wear": 50.0,
        "timestamp": custom_ts
    }
    url = f"/api/machines/{test_machine['id']}/sensors"
    response = client.post(url, json=payload, headers=admin_user["headers"])
    assert response.status_code == 201
    data = response.get_json()["data"]
    assert "2026-08-31" in data["timestamp"]

def test_ingest_telemetry_missing_required_fields(client, admin_user, test_machine):
    """Test validation errors on missing required fields."""
    url = f"/api/machines/{test_machine['id']}/sensors"
    # Missing rotational_speed, torque, tool_wear
    response = client.post(url, json={"air_temp": 298.1, "process_temp": 308.6}, headers=admin_user["headers"])
    assert response.status_code == 422
    assert response.get_json()["error_code"] == "VALIDATION_ERROR"

def test_ingest_telemetry_invalid_numeric_ranges(client, admin_user, test_machine):
    """Test validation errors on unrealistic/negative numeric inputs."""
    url = f"/api/machines/{test_machine['id']}/sensors"
    # Negative rotational speed and negative torque
    response = client.post(url, json={
        "air_temp": 298.1,
        "process_temp": 308.6,
        "rotational_speed": -100.0,
        "torque": -5.0,
        "tool_wear": 10.0
    }, headers=admin_user["headers"])
    assert response.status_code == 422

def test_ingest_telemetry_nonexistent_machine(client, admin_user):
    """Test 404 when machine ID does not exist."""
    fake_id = "507f1f77bcf86cd799439011"
    url = f"/api/machines/{fake_id}/sensors"
    response = client.post(url, json={
        "air_temp": 298.1,
        "process_temp": 308.6,
        "rotational_speed": 1500.0,
        "torque": 40.0,
        "tool_wear": 10.0
    }, headers=admin_user["headers"])
    assert response.status_code == 404
    assert response.get_json()["error_code"] == "MACHINE_NOT_FOUND"

def test_ingest_telemetry_invalid_machine_id(client, admin_user):
    """Test 422 when machine ID format is malformed."""
    url = "/api/machines/invalid-id-format/sensors"
    response = client.post(url, json={
        "air_temp": 298.1,
        "process_temp": 308.6,
        "rotational_speed": 1500.0,
        "torque": 40.0,
        "tool_wear": 10.0
    }, headers=admin_user["headers"])
    assert response.status_code == 422
    assert response.get_json()["error_code"] == "VALIDATION_ERROR"

def test_batch_ingest_telemetry_success(client, admin_user, test_machine):
    """Test bulk ingestion of multiple telemetry readings."""
    readings = [
        {
            "air_temp": 298.0 + i,
            "process_temp": 308.0 + i,
            "rotational_speed": 1500.0 + (i * 10),
            "torque": 40.0 + i,
            "tool_wear": 10.0 + (i * 5)
        }
        for i in range(5)
    ]
    url = f"/api/machines/{test_machine['id']}/sensors/batch"
    response = client.post(url, json={"readings": readings}, headers=admin_user["headers"])
    assert response.status_code == 201
    json_data = response.get_json()
    assert json_data["success"] is True
    assert json_data["data"]["inserted_count"] == 5
    assert len(json_data["data"]["items"]) == 5

def test_batch_ingest_empty_readings_fails(client, admin_user, test_machine):
    """Test batch ingestion fails on empty readings array."""
    url = f"/api/machines/{test_machine['id']}/sensors/batch"
    response = client.post(url, json={"readings": []}, headers=admin_user["headers"])
    assert response.status_code == 422
    assert response.get_json()["error_code"] == "VALIDATION_ERROR"

def test_get_latest_telemetry(client, admin_user, test_machine):
    """Test retrieving the newest telemetry reading."""
    url_ingest = f"/api/machines/{test_machine['id']}/sensors"
    
    # Ingest 3 readings at different timestamps
    client.post(url_ingest, json={
        "air_temp": 295.0, "process_temp": 305.0, "rotational_speed": 1400.0, "torque": 35.0, "tool_wear": 10.0,
        "timestamp": "2026-09-01T10:00:00Z"
    }, headers=admin_user["headers"])
    client.post(url_ingest, json={
        "air_temp": 299.5, "process_temp": 310.5, "rotational_speed": 1550.0, "torque": 44.0, "tool_wear": 25.0,
        "timestamp": "2026-09-01T14:00:00Z"
    }, headers=admin_user["headers"])
    client.post(url_ingest, json={
        "air_temp": 297.0, "process_temp": 307.0, "rotational_speed": 1450.0, "torque": 38.0, "tool_wear": 18.0,
        "timestamp": "2026-09-01T12:00:00Z"
    }, headers=admin_user["headers"])

    # Fetch latest (should be the 14:00 reading)
    url_latest = f"/api/machines/{test_machine['id']}/sensors/latest"
    res = client.get(url_latest, headers=admin_user["headers"])
    assert res.status_code == 200
    json_data = res.get_json()
    assert json_data["success"] is True
    assert json_data["data"]["air_temp"] == 299.5
    assert "2026-09-01T14:00:00" in json_data["data"]["timestamp"]

def test_get_latest_telemetry_no_data(client, admin_user, test_machine):
    """Test 404 when machine has no telemetry records yet."""
    url_latest = f"/api/machines/{test_machine['id']}/sensors/latest"
    res = client.get(url_latest, headers=admin_user["headers"])
    assert res.status_code == 404
    assert res.get_json()["error_code"] == "NO_TELEMETRY_DATA"

def test_get_telemetry_history_pagination(client, admin_user, test_machine):
    """Test paginated retrieval of historical telemetry."""
    url_batch = f"/api/machines/{test_machine['id']}/sensors/batch"
    readings = [
        {
            "air_temp": 298.0, "process_temp": 308.0, "rotational_speed": 1500.0, "torque": 40.0, "tool_wear": float(i),
            "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=i)).isoformat()
        }
        for i in range(15)
    ]
    client.post(url_batch, json={"readings": readings}, headers=admin_user["headers"])

    # Page 1 (limit 10)
    url_hist_p1 = f"/api/machines/{test_machine['id']}/sensors?page=1&page_size=10"
    res_p1 = client.get(url_hist_p1, headers=admin_user["headers"])
    assert res_p1.status_code == 200
    p1_data = res_p1.get_json()["data"]
    assert len(p1_data["items"]) == 10
    assert p1_data["total"] == 15
    assert p1_data["total_pages"] == 2
    assert p1_data["has_next"] is True

    # Page 2 (limit 10)
    url_hist_p2 = f"/api/machines/{test_machine['id']}/sensors?page=2&page_size=10"
    res_p2 = client.get(url_hist_p2, headers=admin_user["headers"])
    assert res_p2.status_code == 200
    p2_data = res_p2.get_json()["data"]
    assert len(p2_data["items"]) == 5
    assert p2_data["has_next"] is False

def test_get_telemetry_history_time_range_filter(client, admin_user, test_machine):
    """Test filtering telemetry history by start_time and end_time."""
    url_batch = f"/api/machines/{test_machine['id']}/sensors/batch"
    readings = [
        {"air_temp": 298.0, "process_temp": 308.0, "rotational_speed": 1500.0, "torque": 40.0, "tool_wear": 10.0, "timestamp": "2026-09-01T08:00:00Z"},
        {"air_temp": 299.0, "process_temp": 309.0, "rotational_speed": 1520.0, "torque": 42.0, "tool_wear": 20.0, "timestamp": "2026-09-01T12:00:00Z"},
        {"air_temp": 301.0, "process_temp": 311.0, "rotational_speed": 1550.0, "torque": 45.0, "tool_wear": 30.0, "timestamp": "2026-09-01T16:00:00Z"}
    ]
    client.post(url_batch, json={"readings": readings}, headers=admin_user["headers"])

    # Query between 10:00 and 14:00 (should only return the 12:00 reading)
    url_filter = f"/api/machines/{test_machine['id']}/sensors?start_time=2026-09-01T10:00:00Z&end_time=2026-09-01T14:00:00Z"
    res = client.get(url_filter, headers=admin_user["headers"])
    assert res.status_code == 200
    items = res.get_json()["data"]["items"]
    assert len(items) == 1
    assert items[0]["air_temp"] == 299.0

def test_get_machine_monitoring_available(client, admin_user, test_machine):
    """Test /monitoring cockpit endpoint when telemetry data exists."""
    url_ingest = f"/api/machines/{test_machine['id']}/sensors"
    client.post(url_ingest, json={
        "air_temp": 298.5, "process_temp": 309.0, "rotational_speed": 1530.0, "torque": 41.5, "tool_wear": 40.0
    }, headers=admin_user["headers"])

    url_mon = f"/api/machines/{test_machine['id']}/monitoring"
    res = client.get(url_mon, headers=admin_user["headers"])
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert data["telemetry_status"] == "AVAILABLE"
    assert data["total_samples"] >= 1
    assert data["machine"]["serial_number"] == test_machine["serial_number"]
    assert data["latest_telemetry"] is not None
    assert data["latest_telemetry"]["air_temp"] == 298.5
    assert len(data["recent_telemetry"]) >= 1

def test_get_machine_monitoring_no_data(client, admin_user, test_machine):
    """Test /monitoring cockpit endpoint when machine has no telemetry records."""
    url_mon = f"/api/machines/{test_machine['id']}/monitoring"
    res = client.get(url_mon, headers=admin_user["headers"])
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert data["telemetry_status"] == "NO_DATA"
    assert data["latest_telemetry"] is None
    assert data["recent_telemetry"] == []
    assert data["total_samples"] == 0
