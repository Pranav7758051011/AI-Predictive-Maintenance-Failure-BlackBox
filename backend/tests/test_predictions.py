import os
import pytest
from app.utils.constants import ProductType, MachineStatus
from app.ml.preprocessing import extract_features_from_dict, FEATURE_COLUMNS
from app.services.ml_service import MLService
from app.ml.predictor import FailurePredictor, ModelNotLoadedError

@pytest.fixture
def test_machine(client, admin_user):
    """Creates a machine for prediction tests."""
    payload = {
        "serial_number": "PRED-CNC-001",
        "name": "Prediction Test Station",
        "product_type": ProductType.MEDIUM,
        "location": "Sector 4",
        "status": MachineStatus.HEALTHY
    }
    res = client.post("/api/machines", json=payload, headers=admin_user["headers"])
    assert res.status_code == 201
    return res.get_json()["data"]

@pytest.fixture
def assigned_machine(client, admin_user, engineer_user):
    """Creates an assigned machine for prediction tests."""
    payload = {
        "serial_number": "ASSIGNED-PRED-002",
        "name": "Assigned Prediction Station",
        "product_type": ProductType.HIGH,
        "location": "Sector 5",
        "assigned_engineer_id": str(engineer_user["user"]["id"])
    }
    res = client.post("/api/machines", json=payload, headers=admin_user["headers"])
    assert res.status_code == 201
    return res.get_json()["data"]

# ----------------- Unit / ML Service Tests -----------------

def test_feature_extraction():
    """Test feature preprocessing extracts all expected engineered features."""
    sample = {
        "air_temp": 298.1,
        "process_temp": 308.6,
        "rotational_speed": 1500.0,
        "torque": 40.0,
        "tool_wear": 50.0,
        "product_type": "M"
    }
    vec = extract_features_from_dict(sample)
    assert vec.shape == (1, len(FEATURE_COLUMNS))
    assert vec[0, 8] == 10.5 # temperature_difference = 308.6 - 298.1

def test_ml_service_inference_normal():
    """Test MLService returns low failure probability for normal operational telemetry."""
    ml_service = MLService()
    normal_telemetry = {
        "air_temp": 298.1,
        "process_temp": 308.6,
        "rotational_speed": 1500.0,
        "torque": 40.0,
        "tool_wear": 20.0,
        "product_type": "M"
    }
    pred = ml_service.predict(normal_telemetry)
    assert "failure_probability" in pred
    assert "failure_prediction" in pred
    assert pred["failure_prediction"] is False
    assert pred["failure_type"] == "NO_FAILURE"
    assert pred["confidence"] > 0.5
    assert pred["model_version"] == "failure-model-v1.0"

    # Health score should be high for normal reading
    health_score = ml_service.calculate_health_score(pred["failure_probability"], normal_telemetry)
    assert health_score >= 80.0

def test_ml_service_inference_extreme_stress():
    """Test MLService detects elevated failure risk for extreme heat dissipation failure telemetry."""
    ml_service = MLService()
    # High heat dissipation condition (high temp diff + low rpm)
    stress_telemetry = {
        "air_temp": 298.0,
        "process_temp": 312.0,
        "rotational_speed": 1300.0,
        "torque": 65.0,
        "tool_wear": 210.0,
        "product_type": "L"
    }
    pred = ml_service.predict(stress_telemetry)
    assert pred["failure_probability"] > 0.3
    health_score = ml_service.calculate_health_score(pred["failure_probability"], stress_telemetry)
    assert health_score < 75.0

def test_missing_model_handling():
    """Test predictor cleanly raises ModelNotLoadedError when model directory is invalid."""
    empty_predictor = FailurePredictor(models_dir="non_existent_directory")
    with pytest.raises(ModelNotLoadedError):
        empty_predictor.predict({"air_temp": 300.0, "process_temp": 310.0, "rotational_speed": 1500, "torque": 40, "tool_wear": 10})

# ----------------- API Integration Tests -----------------

def test_create_prediction_success_admin(client, admin_user, test_machine):
    """Test Admin successfully requesting a prediction on telemetry."""
    payload = {
        "machine_id": test_machine["id"],
        "telemetry": {
            "air_temp": 298.1,
            "process_temp": 308.6,
            "rotational_speed": 1551.0,
            "torque": 42.8,
            "tool_wear": 50.0,
            "product_type": "M"
        }
    }
    response = client.post("/api/predictions", json=payload, headers=admin_user["headers"])
    assert response.status_code == 201
    json_data = response.get_json()
    assert json_data["success"] is True
    data = json_data["data"]
    assert data["machine_id"] == test_machine["id"]
    assert "failure_probability" in data
    assert "failure_prediction" in data
    assert "health_score" in data
    assert "model_version" in data

def test_create_prediction_success_assigned_engineer(client, engineer_user, assigned_machine):
    """Test Assigned Engineer successfully triggering a prediction for their machine."""
    payload = {
        "machine_id": assigned_machine["id"],
        "telemetry": {
            "air_temp": 298.1,
            "process_temp": 308.6,
            "rotational_speed": 1500.0,
            "torque": 40.0,
            "tool_wear": 10.0
        }
    }
    response = client.post("/api/predictions", json=payload, headers=engineer_user["headers"])
    assert response.status_code == 201

def test_create_prediction_unassigned_engineer(client, second_engineer_user, assigned_machine):
    """Test Engineer 2 can generate prediction on any fleet machine without lockout."""
    payload = {
        "machine_id": assigned_machine["id"],
        "telemetry": {
            "air_temp": 298.1,
            "process_temp": 308.6,
            "rotational_speed": 1500.0,
            "torque": 40.0,
            "tool_wear": 10.0
        }
    }
    response = client.post("/api/predictions", json=payload, headers=second_engineer_user["headers"])
    assert response.status_code == 201
    assert response.get_json()["success"] is True

def test_create_prediction_viewer(client, viewer_user, test_machine):
    """Test Viewer / Client can trigger live predictions for interactive simulation."""
    payload = {
        "machine_id": test_machine["id"],
        "telemetry": {
            "air_temp": 298.1,
            "process_temp": 308.6,
            "rotational_speed": 1500.0,
            "torque": 40.0,
            "tool_wear": 10.0
        }
    }
    response = client.post("/api/predictions", json=payload, headers=viewer_user["headers"])
    assert response.status_code == 201
    assert response.get_json()["success"] is True

def test_create_prediction_unauthenticated(client, test_machine):
    """Test unauthenticated prediction request succeeds seamlessly for interactive physics engine."""
    payload = {
        "machine_id": test_machine["id"],
        "telemetry": {"air_temp": 298.1, "process_temp": 308.6, "rotational_speed": 1500.0, "torque": 40.0, "tool_wear": 10.0}
    }
    response = client.post("/api/predictions", json=payload)
    assert response.status_code == 201
    assert response.get_json()["success"] is True

def test_predict_from_latest_telemetry_success(client, admin_user, test_machine):
    """Test generating prediction using machine's latest telemetry."""
    # Ingest sensor reading first
    ingest_url = f"/api/machines/{test_machine['id']}/sensors"
    client.post(ingest_url, json={
        "air_temp": 298.5,
        "process_temp": 309.0,
        "rotational_speed": 1520.0,
        "torque": 41.0,
        "tool_wear": 30.0
    }, headers=admin_user["headers"])

    # Predict from latest
    pred_url = f"/api/machines/{test_machine['id']}/predictions"
    res = client.post(pred_url, json={}, headers=admin_user["headers"])
    assert res.status_code == 201
    data = res.get_json()["data"]
    assert data["sensor_data_id"] is not None
    assert "health_score" in data

def test_predict_from_latest_telemetry_nonexistent_machine(client, admin_user):
    """Test 404 error when trying to predict on non-existent machine."""
    fake_id = "507f1f77bcf86cd799439011"
    pred_url = f"/api/machines/{fake_id}/predictions"
    res = client.post(pred_url, json={}, headers=admin_user["headers"])
    assert res.status_code == 404
    assert res.get_json()["error_code"] == "MACHINE_NOT_FOUND"

def test_get_prediction_by_id(client, admin_user, test_machine):
    """Test retrieving specific prediction by ID."""
    # Create prediction
    res_create = client.post("/api/predictions", json={
        "machine_id": test_machine["id"],
        "telemetry": {"air_temp": 298.1, "process_temp": 308.6, "rotational_speed": 1500.0, "torque": 40.0, "tool_wear": 10.0}
    }, headers=admin_user["headers"])
    pred_id = res_create.get_json()["data"]["id"]

    # Fetch by ID
    res_get = client.get(f"/api/predictions/{pred_id}", headers=admin_user["headers"])
    assert res_get.status_code == 200
    assert res_get.get_json()["data"]["id"] == pred_id

def test_list_predictions_pagination_and_filters(client, admin_user, test_machine):
    """Test listing historical predictions with pagination."""
    # Create 3 predictions
    for _ in range(3):
        client.post("/api/predictions", json={
            "machine_id": test_machine["id"],
            "telemetry": {"air_temp": 298.1, "process_temp": 308.6, "rotational_speed": 1500.0, "torque": 40.0, "tool_wear": 10.0}
        }, headers=admin_user["headers"])

    # Query with machine filter
    res = client.get(f"/api/predictions?machine_id={test_machine['id']}&page=1&page_size=2", headers=admin_user["headers"])
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert len(data["items"]) == 2
    assert data["total"] >= 3

def test_get_machine_health_and_risk(client, admin_user, test_machine):
    """Test /health and /risk endpoints return current health score and risk level."""
    # Create a prediction
    client.post("/api/predictions", json={
        "machine_id": test_machine["id"],
        "telemetry": {"air_temp": 298.1, "process_temp": 308.6, "rotational_speed": 1500.0, "torque": 40.0, "tool_wear": 10.0}
    }, headers=admin_user["headers"])

    # Check health endpoint
    res_health = client.get(f"/api/machines/{test_machine['id']}/health", headers=admin_user["headers"])
    assert res_health.status_code == 200
    h_data = res_health.get_json()["data"]
    assert "health_score" in h_data
    assert "health_status" in h_data
    assert h_data["health_status"] in ["EXCELLENT", "GOOD", "WARNING", "POOR", "CRITICAL"]

    # Check risk alias endpoint
    res_risk = client.get(f"/api/machines/{test_machine['id']}/risk", headers=admin_user["headers"])
    assert res_risk.status_code == 200
    assert res_risk.get_json()["data"]["health_score"] == h_data["health_score"]

def test_get_machine_health_nonexistent(client, admin_user):
    """Test 404 when querying health of non-existent machine."""
    fake_id = "507f1f77bcf86cd799439011"
    res_health = client.get(f"/api/machines/{fake_id}/health", headers=admin_user["headers"])
    assert res_health.status_code == 404
    assert res_health.get_json()["error_code"] == "MACHINE_NOT_FOUND"
