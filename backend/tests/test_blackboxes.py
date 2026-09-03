import pytest
from datetime import datetime, timezone, timedelta
from app.utils.constants import ProductType, MachineStatus

@pytest.fixture
def test_machine(client, admin_user):
    """Creates a machine for blackbox tests."""
    payload = {
        "serial_number": "BLACKBOX-CNC-001",
        "name": "Black Box Test Station",
        "product_type": ProductType.MEDIUM,
        "location": "Bay 9",
        "status": MachineStatus.HEALTHY
    }
    res = client.post("/api/machines", json=payload, headers=admin_user["headers"])
    assert res.status_code == 201
    return res.get_json()["data"]

@pytest.fixture
def assigned_machine(client, admin_user, engineer_user):
    """Creates an assigned machine for blackbox tests."""
    payload = {
        "serial_number": "ASSIGNED-BB-002",
        "name": "Assigned BB Station",
        "product_type": ProductType.HIGH,
        "location": "Bay 10",
        "assigned_engineer_id": str(engineer_user["user"]["id"])
    }
    res = client.post("/api/machines", json=payload, headers=admin_user["headers"])
    assert res.status_code == 201
    return res.get_json()["data"]

def test_auto_blackbox_creation_on_failure_prediction(client, admin_user, test_machine):
    """
    Demonstration Scenario:
    1. Sensor telemetry is ingested.
    2. Prediction is run which detects high-risk failure.
    3. Failure Black Box is automatically sealed with 24h telemetry snapshot, timeline, and audit log.
    """
    # 1. Ingest telemetry samples
    ingest_url = f"/api/machines/{test_machine['id']}/sensors"
    client.post(ingest_url, json={
        "air_temp": 298.0, "process_temp": 308.0, "rotational_speed": 1500.0, "torque": 40.0, "tool_wear": 20.0
    }, headers=admin_user["headers"])

    # 2. Ingest extreme heat dissipation failure telemetry
    client.post(ingest_url, json={
        "air_temp": 304.0, "process_temp": 314.0, "rotational_speed": 1150.0, "torque": 80.0, "tool_wear": 245.0
    }, headers=admin_user["headers"])

    # 3. Predict from latest (triggers failure prediction & automatic black box generation)
    pred_url = f"/api/machines/{test_machine['id']}/predictions"
    pred_res = client.post(pred_url, json={}, headers=admin_user["headers"])
    assert pred_res.status_code == 201
    pred_data = pred_res.get_json()["data"]
    
    assert pred_data["failure_prediction"] is True
    assert "blackbox_code" in pred_data
    assert pred_data["blackbox_code"].startswith("BB-")

    # 4. Verify Black Box exists and contains snapshot
    bb_code = pred_data["blackbox_code"]
    bb_res = client.get(f"/api/blackboxes/code/{bb_code}", headers=admin_user["headers"])
    assert bb_res.status_code == 200
    bb_data = bb_res.get_json()["data"]

    assert bb_data["blackbox_code"] == bb_code
    assert bb_data["machine_snapshot"]["serial_number"] == test_machine["serial_number"]
    assert bb_data["failure_summary"]["failure_prediction"] is True
    assert len(bb_data["telemetry_history"]) >= 2
    assert len(bb_data["event_timeline"]) >= 3
    assert bb_data["incident_status"] == "OPEN"

def test_blackbox_idempotency_duplicate_prevention(client, admin_user, test_machine):
    """Test generating Black Box for the same trigger prediction is idempotent."""
    # Create failure prediction
    pred_res = client.post("/api/predictions", json={
        "machine_id": test_machine["id"],
        "telemetry": {"air_temp": 298.0, "process_temp": 313.0, "rotational_speed": 1250.0, "torque": 68.0, "tool_wear": 215.0}
    }, headers=admin_user["headers"])
    pred_data = pred_res.get_json()["data"]
    pred_id = pred_data["id"]

    # Manual call 1
    gen_res1 = client.post("/api/blackboxes/generate", json={"prediction_id": pred_id}, headers=admin_user["headers"])
    assert gen_res1.status_code == 201
    bb1 = gen_res1.get_json()["data"]

    # Manual call 2 (should return the exact same Black Box)
    gen_res2 = client.post("/api/blackboxes/generate", json={"prediction_id": pred_id}, headers=admin_user["headers"])
    assert gen_res2.status_code == 201
    bb2 = gen_res2.get_json()["data"]

    assert bb1["id"] == bb2["id"]
    assert bb1["blackbox_code"] == bb2["blackbox_code"]

def test_failure_replay_endpoint(client, admin_user, test_machine):
    """Test chronological replay endpoint returns time-series frames for playback."""
    # Ingest 2 normal and 1 failure telemetry records
    ingest_url = f"/api/machines/{test_machine['id']}/sensors"
    client.post(ingest_url, json={"air_temp": 298.0, "process_temp": 308.0, "rotational_speed": 1500.0, "torque": 40.0, "tool_wear": 50.0}, headers=admin_user["headers"])
    client.post(ingest_url, json={"air_temp": 299.0, "process_temp": 310.0, "rotational_speed": 1400.0, "torque": 45.0, "tool_wear": 100.0}, headers=admin_user["headers"])
    client.post(ingest_url, json={"air_temp": 304.0, "process_temp": 314.0, "rotational_speed": 1150.0, "torque": 80.0, "tool_wear": 245.0}, headers=admin_user["headers"])

    # Predict from latest & trigger automatic black box
    pred_res = client.post(f"/api/machines/{test_machine['id']}/predictions", json={}, headers=admin_user["headers"])
    assert pred_res.status_code == 201
    bb_code = pred_res.get_json()["data"]["blackbox_code"]

    # Fetch replay frames
    replay_res = client.get(f"/api/blackboxes/{bb_code}/replay", headers=admin_user["headers"])
    assert replay_res.status_code == 200
    replay_data = replay_res.get_json()["data"]

    assert replay_data["blackbox_code"] == bb_code
    assert replay_data["total_frames"] >= 3
    assert len(replay_data["frames"]) >= 3
    assert "telemetry" in replay_data["frames"][0]
    assert "air_temp" in replay_data["frames"][0]["telemetry"]

def test_blackbox_audit_trail(client, admin_user, test_machine):
    """Test audit trail logs BLACKBOX_CREATED, BLACKBOX_VIEWED, and BLACKBOX_REPLAYED."""
    # Create failure prediction
    pred_res = client.post("/api/predictions", json={
        "machine_id": test_machine["id"],
        "telemetry": {"air_temp": 298.0, "process_temp": 313.0, "rotational_speed": 1250.0, "torque": 68.0, "tool_wear": 215.0}
    }, headers=admin_user["headers"])
    bb_id = pred_res.get_json()["data"]["blackbox_id"]

    # View Black Box
    client.get(f"/api/blackboxes/{bb_id}", headers=admin_user["headers"])

    # Replay Black Box
    client.get(f"/api/blackboxes/{bb_id}/replay", headers=admin_user["headers"])

    # Fetch Audit Trail
    audit_res = client.get(f"/api/blackboxes/{bb_id}/audit", headers=admin_user["headers"])
    assert audit_res.status_code == 200
    audit_data = audit_res.get_json()["data"]

    actions = [log["action"] for log in audit_data["items"]]
    assert "BLACKBOX_CREATED" in actions
    assert "BLACKBOX_VIEWED" in actions
    assert "BLACKBOX_REPLAYED" in actions

def test_update_blackbox_status_lifecycle(client, admin_user, test_machine):
    """Test updating incident lifecycle status (OPEN -> UNDER_REVIEW -> RESOLVED) and audit logging."""
    pred_res = client.post("/api/predictions", json={
        "machine_id": test_machine["id"],
        "telemetry": {"air_temp": 298.0, "process_temp": 313.0, "rotational_speed": 1250.0, "torque": 68.0, "tool_wear": 215.0}
    }, headers=admin_user["headers"])
    bb_id = pred_res.get_json()["data"]["blackbox_id"]

    # Update to UNDER_REVIEW
    patch_res = client.patch(f"/api/blackboxes/{bb_id}/status", json={"incident_status": "UNDER_REVIEW"}, headers=admin_user["headers"])
    assert patch_res.status_code == 200
    assert patch_res.get_json()["data"]["incident_status"] == "UNDER_REVIEW"

    # Update to RESOLVED
    patch_res2 = client.patch(f"/api/blackboxes/{bb_id}/status", json={"incident_status": "RESOLVED"}, headers=admin_user["headers"])
    assert patch_res2.status_code == 200
    assert patch_res2.get_json()["data"]["incident_status"] == "RESOLVED"

    # Check that audit log recorded BLACKBOX_STATUS_CHANGED
    audit_res = client.get(f"/api/blackboxes/{bb_id}/audit", headers=admin_user["headers"])
    actions = [log["action"] for log in audit_res.get_json()["data"]["items"]]
    assert "BLACKBOX_STATUS_CHANGED" in actions

def test_blackbox_rbac_access_control(client, admin_user, engineer_user, second_engineer_user, viewer_user, assigned_machine):
    """Test RBAC permissions on Black Box generation and viewing."""
    # Create prediction on assigned machine
    pred_res = client.post("/api/predictions", json={
        "machine_id": assigned_machine["id"],
        "telemetry": {"air_temp": 298.0, "process_temp": 313.0, "rotational_speed": 1250.0, "torque": 68.0, "tool_wear": 215.0}
    }, headers=engineer_user["headers"])
    bb_id = pred_res.get_json()["data"]["blackbox_id"]

    # Assigned engineer can view
    res_eng = client.get(f"/api/blackboxes/{bb_id}", headers=engineer_user["headers"])
    assert res_eng.status_code == 200

    # Unassigned engineer 2 forbidden
    res_eng2 = client.get(f"/api/blackboxes/{bb_id}", headers=second_engineer_user["headers"])
    assert res_eng2.status_code == 403
    assert res_eng2.get_json()["error_code"] == "MACHINE_ACCESS_DENIED"

    # Viewer can read Black Box
    res_view = client.get(f"/api/blackboxes/{bb_id}", headers=viewer_user["headers"])
    assert res_view.status_code == 200

    # Viewer cannot modify status
    res_view_patch = client.patch(f"/api/blackboxes/{bb_id}/status", json={"incident_status": "RESOLVED"}, headers=viewer_user["headers"])
    assert res_view_patch.status_code == 403

def test_list_and_filter_blackboxes(client, admin_user, test_machine):
    """Test listing and filtering blackbox incidents by machine and status."""
    res = client.get(f"/api/blackboxes?machine_id={test_machine['id']}&incident_status=OPEN&page=1&page_size=10", headers=admin_user["headers"])
    assert res.status_code == 200
    assert "items" in res.get_json()["data"]

def test_get_machine_blackboxes_endpoint(client, admin_user, test_machine):
    """Test GET /api/machines/{id}/blackboxes."""
    res = client.get(f"/api/machines/{test_machine['id']}/blackboxes", headers=admin_user["headers"])
    assert res.status_code == 200
    assert "items" in res.get_json()["data"]
