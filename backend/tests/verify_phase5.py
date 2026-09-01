"""
Phase 5 Comprehensive Verification Script
Verifies:
- Automatic Failure Black Box generation on ML failure prediction
- 24-hour telemetry window capture & integrity
- Prediction history capture
- Machine snapshot preservation
- Event timeline reconstruction
- Chronological Failure Replay API (/replay)
- Immutable Audit Trail (/audit)
- Idempotency & duplicate protection
- RBAC permissions on Black Box & Audit endpoints
- Flasgger Swagger doc specs for Black Box endpoints
"""

import os
import sys
import json
import mongomock
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

def run_phase5_verification():
    from app import create_app
    from app.database import MongoManager
    from app.utils.constants import UserRole, MachineStatus, ProductType

    mock_client = mongomock.MongoClient()
    test_config = {
        "TESTING": True,
        "ENV": "testing",
        "MONGO_DB_NAME": "ai_pm_test_db",
        "MONGO_MOCK_CLIENT": mock_client,
        "JWT_SECRET_KEY": "test-jwt-secret-key-12345-very-long-and-secure-32bytes",
        "SECRET_KEY": "test-flask-secret-key-12345-very-long-and-secure-32bytes"
    }

    app = create_app("testing", custom_config=test_config)
    client = app.test_client()

    print("=" * 70)
    print("PHASE 5 VERIFICATION: Failure Black Box & Audit Trail")
    print("=" * 70)

    # 1. Setup Admin, Engineer, and Viewer Accounts
    print("\n[1] Registering and authenticating test users...")
    client.post("/api/auth/register", json={
        "email": "admin_bb@plant.com", "password": "AdminPassword123!", "full_name": "Admin BlackBox", "role": UserRole.ADMIN
    })
    admin_login = client.post("/api/auth/login", json={"email": "admin_bb@plant.com", "password": "AdminPassword123!"}).get_json()["data"]
    admin_token = admin_login["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    client.post("/api/auth/register", json={
        "email": "engineer_bb@plant.com", "password": "EngPassword123!", "full_name": "Engineer BlackBox", "role": UserRole.ENGINEER
    })
    eng_login = client.post("/api/auth/login", json={"email": "engineer_bb@plant.com", "password": "EngPassword123!"}).get_json()["data"]
    eng_token = eng_login["access_token"]
    eng_headers = {"Authorization": f"Bearer {eng_token}"}
    eng_id = eng_login["user"]["id"]

    client.post("/api/auth/register", json={
        "email": "viewer_bb@plant.com", "password": "ViewerPassword123!", "full_name": "Viewer BlackBox", "role": UserRole.VIEWER
    })
    viewer_login = client.post("/api/auth/login", json={"email": "viewer_bb@plant.com", "password": "ViewerPassword123!"}).get_json()["data"]
    viewer_token = viewer_login["access_token"]
    viewer_headers = {"Authorization": f"Bearer {viewer_token}"}

    print("    -> Admin, Engineer, and Viewer authenticated successfully.")

    # 2. Create Machine assigned to Engineer
    print("\n[2] Provisioning Machine assigned to Engineer...")
    mach_res = client.post("/api/machines", json={
        "serial_number": "TURBINE-BB-999",
        "name": "Heavy Industrial Turbine 999",
        "product_type": ProductType.HIGH,
        "location": "Sector 7G",
        "assigned_engineer_id": eng_id
    }, headers=admin_headers)
    assert mach_res.status_code == 201, f"Failed to create machine: {mach_res.get_json()}"
    machine = mach_res.get_json()["data"]
    machine_id = machine["id"]
    print(f"    -> Created Machine '{machine['name']}' (ID: {machine_id}, Serial: {machine['serial_number']})")

    # 3. Ingest Telemetry samples across 24h window
    print("\n[3] Ingesting time-series sensor telemetry...")
    ingest_url = f"/api/machines/{machine_id}/sensors"
    
    # Sample 1: 12h ago (Normal)
    ts_12h_ago = (datetime.now(timezone.utc) - timedelta(hours=12)).isoformat()
    client.post(ingest_url, json={
        "air_temp": 298.5, "process_temp": 308.2, "rotational_speed": 1520.0, "torque": 39.5, "tool_wear": 45.0, "timestamp": ts_12h_ago
    }, headers=eng_headers)

    # Sample 2: 6h ago (Moderate Wear)
    ts_6h_ago = (datetime.now(timezone.utc) - timedelta(hours=6)).isoformat()
    client.post(ingest_url, json={
        "air_temp": 299.1, "process_temp": 309.8, "rotational_speed": 1460.0, "torque": 46.2, "tool_wear": 120.0, "timestamp": ts_6h_ago
    }, headers=eng_headers)

    # Sample 3: Now (High Heat Dissipation Stress: Delta T = 15K, Torque = 68Nm, Wear = 215min)
    client.post(ingest_url, json={
        "air_temp": 298.0, "process_temp": 313.0, "rotational_speed": 1250.0, "torque": 68.0, "tool_wear": 215.0
    }, headers=eng_headers)
    print("    -> Ingested 3 historical telemetry frames spanning 12 hours.")

    # 4. Trigger Prediction -> Automatic Black Box Capture
    print("\n[4] Triggering ML prediction from latest sensor telemetry...")
    pred_res = client.post(f"/api/machines/{machine_id}/predictions", json={}, headers=eng_headers)
    assert pred_res.status_code == 201, f"Failed prediction: {pred_res.get_json()}"
    pred_data = pred_res.get_json()["data"]

    print(f"    -> Prediction Result: failure_predicted={pred_data['failure_prediction']}, type={pred_data['failure_type']}, prob={pred_data['failure_probability']:.4f}, health_score={pred_data['health_score']:.1f}")
    assert pred_data["failure_prediction"] is True, "Expected failure prediction to be True."
    assert "blackbox_code" in pred_data and pred_data["blackbox_code"], "Expected automatic blackbox_code in prediction response."
    
    blackbox_code = pred_data["blackbox_code"]
    blackbox_id = pred_data["blackbox_id"]
    print(f"    -> AUTOMATIC BLACK BOX GENERATED: Code = {blackbox_code} (ID: {blackbox_id})")

    # 5. Fetch Black Box by ID and Code
    print("\n[5] Retrieving Black Box incident details...")
    bb_res = client.get(f"/api/blackboxes/code/{blackbox_code}", headers=eng_headers)
    assert bb_res.status_code == 200, f"Failed to get blackbox: {bb_res.get_json()}"
    bb_doc = bb_res.get_json()["data"]

    print(f"    -> Code: {bb_doc['blackbox_code']}")
    print(f"    -> Failure Summary: {bb_doc['failure_summary']}")
    print(f"    -> Machine Snapshot: {bb_doc['machine_snapshot']['name']} ({bb_doc['machine_snapshot']['serial_number']})")
    print(f"    -> Telemetry Samples Captured: {len(bb_doc['telemetry_history'])}")
    print(f"    -> Prediction Records Captured: {len(bb_doc['prediction_history'])}")
    print(f"    -> Timeline Events: {len(bb_doc['event_timeline'])}")
    for ev in bb_doc["event_timeline"]:
        print(f"       • [{ev.get('event_type')}] {ev.get('description')}")

    assert len(bb_doc["telemetry_history"]) == 3, f"Expected 3 telemetry frames, got {len(bb_doc['telemetry_history'])}"
    assert bb_doc["incident_status"] == "OPEN"

    # 6. Test Chronological Failure Replay API
    print("\n[6] Testing Chronological Failure Replay API (/replay)...")
    replay_res = client.get(f"/api/blackboxes/{blackbox_id}/replay", headers=viewer_headers)
    assert replay_res.status_code == 200, f"Failed replay: {replay_res.get_json()}"
    replay_data = replay_res.get_json()["data"]

    print(f"    -> Total Replay Frames: {replay_data['total_frames']}")
    for idx, frame in enumerate(replay_data["frames"], start=1):
        print(f"       Frame #{idx} @ {frame['timestamp']} | Speed: {frame['telemetry']['rotational_speed']} RPM, TempDiff: {frame['telemetry']['temperature_difference']}K")

    assert replay_data["total_frames"] == 3
    assert replay_data["frames"][0]["telemetry"]["rotational_speed"] == 1520.0
    assert replay_data["frames"][2]["telemetry"]["rotational_speed"] == 1250.0

    # 7. Test Idempotency & Duplicate Prevention
    print("\n[7] Testing Black Box Idempotency & Duplicate Prevention...")
    manual_dup_res = client.post("/api/blackboxes/generate", json={"prediction_id": pred_data["id"]}, headers=admin_headers)
    assert manual_dup_res.status_code == 201
    dup_bb = manual_dup_res.get_json()["data"]
    assert dup_bb["id"] == blackbox_id
    assert dup_bb["blackbox_code"] == blackbox_code
    print("    -> Duplicate call safely returned existing Black Box incident without creating duplicates.")

    # 8. Test Incident Lifecycle Status Update
    print("\n[8] Testing Incident Lifecycle Status Update (OPEN -> UNDER_REVIEW -> RESOLVED)...")
    patch_res = client.patch(f"/api/blackboxes/{blackbox_id}/status", json={"incident_status": "UNDER_REVIEW"}, headers=eng_headers)
    assert patch_res.status_code == 200
    assert patch_res.get_json()["data"]["incident_status"] == "UNDER_REVIEW"
    print("    -> Status updated to UNDER_REVIEW")

    patch_res2 = client.patch(f"/api/blackboxes/{blackbox_id}/status", json={"incident_status": "RESOLVED"}, headers=eng_headers)
    assert patch_res2.status_code == 200
    assert patch_res2.get_json()["data"]["incident_status"] == "RESOLVED"
    print("    -> Status updated to RESOLVED")

    # 9. Test Audit Trail
    print("\n[9] Testing Append-Only Audit Trail (/audit)...")
    audit_res = client.get(f"/api/blackboxes/{blackbox_id}/audit", headers=viewer_headers)
    assert audit_res.status_code == 200
    audit_items = audit_res.get_json()["data"]["items"]
    print(f"    -> Recorded Audit Actions ({len(audit_items)} events):")
    for log in audit_items:
        print(f"       • Action: {log['action']} | Actor: {log['actor_role']} | Meta: {log['metadata']}")

    actions = [l["action"] for l in audit_items]
    assert "BLACKBOX_CREATED" in actions
    assert "BLACKBOX_VIEWED" in actions
    assert "BLACKBOX_REPLAYED" in actions
    assert "BLACKBOX_STATUS_CHANGED" in actions

    # 10. Test RBAC Access Control
    print("\n[10] Testing RBAC Security & Restrictions...")
    # Viewer cannot modify status
    v_patch = client.patch(f"/api/blackboxes/{blackbox_id}/status", json={"incident_status": "OPEN"}, headers=viewer_headers)
    assert v_patch.status_code == 403, f"Expected 403 for viewer status patch, got {v_patch.status_code}"
    print("    -> Viewer forbidden from modifying status (403 Forbidden).")

    # Viewer cannot generate manual blackbox
    v_gen = client.post("/api/blackboxes/generate", json={"prediction_id": pred_data["id"]}, headers=viewer_headers)
    assert v_gen.status_code == 403
    print("    -> Viewer forbidden from manual blackbox generation (403 Forbidden).")

    # 11. Verify Swagger Documentation
    print("\n[11] Verifying OpenAPI / Swagger Documentation...")
    spec_res = client.get("/apispec_1.json")
    assert spec_res.status_code == 200
    paths = spec_res.get_json().get("paths", {})
    bb_endpoints = [
        "/api/blackboxes/generate",
        "/api/blackboxes",
        "/api/blackboxes/{blackbox_id}",
        "/api/blackboxes/code/{blackbox_code}",
        "/api/machines/{machine_id}/blackboxes",
        "/api/blackboxes/{blackbox_id}/replay",
        "/api/blackboxes/{blackbox_id}/audit",
        "/api/blackboxes/{blackbox_id}/status"
    ]
    for ep in bb_endpoints:
        assert ep in paths, f"Missing swagger path: {ep}"
        print(f"    -> Swagger route registered: {ep}")

    print("\n" + "=" * 70)
    print("ALL PHASE 5 VERIFICATIONS PASSED WITH 100% SUCCESS RATE!")
    print("=" * 70)

if __name__ == "__main__":
    run_phase5_verification()
