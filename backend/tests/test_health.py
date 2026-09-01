import pytest

def test_root_endpoint(client):
    """Test root service discovery endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data["success"] is True
    assert "documentation" in json_data["data"]
    assert json_data["data"]["documentation"] == "/api/docs/"
    assert json_data["data"]["health_check"] == "/api/health"

def test_health_check_endpoint(client):
    """Test /health endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data["success"] is True
    assert json_data["data"]["status"] == "healthy"
    assert "timestamp" in json_data["data"]
    assert "uptime_seconds" in json_data["data"]
    assert "database" in json_data["data"]
    assert json_data["data"]["database"]["status"] == "connected"

def test_api_health_check_endpoint(client):
    """Test /api/health endpoint."""
    response = client.get("/api/health")
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data["success"] is True
    assert json_data["data"]["status"] == "healthy"
    assert json_data["data"]["database"]["database"] == "ai_pm_test_db"
