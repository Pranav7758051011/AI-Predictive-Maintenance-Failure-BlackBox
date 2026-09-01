import pytest

def test_get_profile(client, engineer_user):
    """Test retrieving user profile."""
    response = client.get("/api/users/profile", headers=engineer_user["headers"])
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data["success"] is True
    assert json_data["data"]["email"] == "engineer1@plant.com"
    assert json_data["data"]["full_name"] == "Lead Engineer"
    assert "password_hash" not in json_data["data"]

def test_update_profile(client, engineer_user):
    """Test updating user full name."""
    payload = {"full_name": "Senior Lead Engineer"}
    response = client.put("/api/users/profile", json=payload, headers=engineer_user["headers"])
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data["success"] is True
    assert json_data["data"]["full_name"] == "Senior Lead Engineer"

    # Verify persistent update
    get_res = client.get("/api/users/profile", headers=engineer_user["headers"])
    assert get_res.get_json()["data"]["full_name"] == "Senior Lead Engineer"

def test_update_profile_cannot_escalate_role(client, viewer_user):
    """Test that attempting to update role via profile update endpoint is ignored/prevented."""
    payload = {
        "full_name": "Viewer Escalation Attempt",
        "role": "ADMIN" # injected field
    }
    response = client.put("/api/users/profile", json=payload, headers=viewer_user["headers"])
    assert response.status_code == 200
    json_data = response.get_json()
    # Role MUST remain VIEWER
    assert json_data["data"]["role"] == "VIEWER"

def test_change_password_success(client, auth_service):
    """Test successfully changing user password and logging in with new password."""
    # Register user
    user = auth_service.register({
        "email": "pwchange@plant.com",
        "password": "OldPassword123!",
        "full_name": "Password Changer"
    })
    login_res = client.post("/api/auth/login", json={
        "email": "pwchange@plant.com",
        "password": "OldPassword123!"
    })
    token = login_res.get_json()["data"]["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    # Change password
    change_res = client.put("/api/users/change-password", json={
        "current_password": "OldPassword123!",
        "new_password": "BrandNewPassword456!"
    }, headers=auth_headers)
    assert change_res.status_code == 200
    assert change_res.get_json()["success"] is True

    # Attempt login with old password (should fail)
    old_login = client.post("/api/auth/login", json={
        "email": "pwchange@plant.com",
        "password": "OldPassword123!"
    })
    assert old_login.status_code == 401

    # Attempt login with new password (should succeed)
    new_login = client.post("/api/auth/login", json={
        "email": "pwchange@plant.com",
        "password": "BrandNewPassword456!"
    })
    assert new_login.status_code == 200

def test_change_password_invalid_current_password(client, engineer_user):
    """Test change password fails when current password is wrong."""
    response = client.put("/api/users/change-password", json={
        "current_password": "WrongCurrentPassword123!",
        "new_password": "BrandNewPassword456!"
    }, headers=engineer_user["headers"])
    assert response.status_code == 401
    json_data = response.get_json()
    assert json_data["success"] is False
    assert json_data["error_code"] == "INVALID_CURRENT_PASSWORD"

def test_change_password_weak_new_password(client, engineer_user):
    """Test change password fails when new password is weak."""
    response = client.put("/api/users/change-password", json={
        "current_password": "EngineerPassword123!",
        "new_password": "short"
    }, headers=engineer_user["headers"])
    assert response.status_code == 422
    assert response.get_json()["error_code"] == "VALIDATION_ERROR"
