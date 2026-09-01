import pytest
from app.utils.exceptions import NotFoundError, ValidationError, ForbiddenError, UnauthorizedError

def test_404_not_found(client):
    """Test standard 404 error envelope."""
    response = client.get("/api/nonexistent-endpoint-route")
    assert response.status_code == 404
    json_data = response.get_json()
    assert json_data["success"] is False
    assert json_data["error_code"] == "NOT_FOUND"
    assert "message" in json_data

def test_405_method_not_allowed(client):
    """Test 405 Method Not Allowed error envelope."""
    response = client.post("/health", json={})
    assert response.status_code == 405
    json_data = response.get_json()
    assert json_data["success"] is False
    assert json_data["error_code"] == "METHOD_NOT_ALLOWED"

def test_custom_app_exception_envelope(app):
    """Test that custom AppExceptions are rendered in the standard error envelope."""
    @app.route("/test-custom-error")
    def trigger_error():
        raise NotFoundError("Machine with ID 12345 not found", error_code="MACHINE_NOT_FOUND")

    client = app.test_client()
    response = client.get("/test-custom-error")
    assert response.status_code == 404
    json_data = response.get_json()
    assert json_data["success"] is False
    assert json_data["error_code"] == "MACHINE_NOT_FOUND"
    assert json_data["message"] == "Machine with ID 12345 not found"

def test_validation_error_envelope(app):
    """Test validation error format with field-level errors."""
    @app.route("/test-validation-error")
    def trigger_validation_error():
        raise ValidationError(
            message="Invalid machine payload",
            errors=[{"field": "serial_number", "message": "Required field"}]
        )

    client = app.test_client()
    response = client.get("/test-validation-error")
    assert response.status_code == 422
    json_data = response.get_json()
    assert json_data["success"] is False
    assert json_data["error_code"] == "VALIDATION_ERROR"
    assert len(json_data["errors"]) == 1
    assert json_data["errors"][0]["field"] == "serial_number"
