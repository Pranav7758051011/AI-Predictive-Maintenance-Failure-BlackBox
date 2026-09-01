import pytest
from app.utils.constants import UserRole

def test_register_success(client):
    """Test successful user registration."""
    payload = {
        "email": "newuser@plant.com",
        "password": "SecurePassword123!",
        "full_name": "New Plant Operator",
        "role": UserRole.VIEWER
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    json_data = response.get_json()
    assert json_data["success"] is True
    assert "data" in json_data
    assert json_data["data"]["email"] == "newuser@plant.com"
    assert json_data["data"]["full_name"] == "New Plant Operator"
    assert json_data["data"]["role"] == UserRole.VIEWER
    assert "password_hash" not in json_data["data"]
    assert "password" not in json_data["data"]

def test_register_duplicate_email(client):
    """Test that duplicate email registration returns 409 Conflict."""
    payload = {
        "email": "duplicate@plant.com",
        "password": "SecurePassword123!",
        "full_name": "Original User",
        "role": UserRole.VIEWER
    }
    # Register first
    res1 = client.post("/api/auth/register", json=payload)
    assert res1.status_code == 201

    # Attempt duplicate
    res2 = client.post("/api/auth/register", json=payload)
    assert res2.status_code == 409
    json_data = res2.get_json()
    assert json_data["success"] is False
    assert json_data["error_code"] == "EMAIL_ALREADY_EXISTS"

def test_register_invalid_data(client):
    """Test validation errors on missing fields or weak password."""
    # Weak password (< 8 chars)
    res_weak = client.post("/api/auth/register", json={
        "email": "valid@plant.com",
        "password": "short",
        "full_name": "Test Name"
    })
    assert res_weak.status_code == 422
    assert res_weak.get_json()["error_code"] == "VALIDATION_ERROR"

    # Invalid email format
    res_email = client.post("/api/auth/register", json={
        "email": "not-an-email",
        "password": "ValidPassword123!",
        "full_name": "Test Name"
    })
    assert res_email.status_code == 422

def test_login_success(client):
    """Test successful login returns access & refresh tokens and safe user."""
    # Register user
    client.post("/api/auth/register", json={
        "email": "login_test@plant.com",
        "password": "LoginPass123!",
        "full_name": "Login Test User",
        "role": UserRole.ENGINEER
    })

    # Login
    response = client.post("/api/auth/login", json={
        "email": "login_test@plant.com",
        "password": "LoginPass123!"
    })
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data["success"] is True
    assert "access_token" in json_data["data"]
    assert "refresh_token" in json_data["data"]
    assert json_data["data"]["token_type"] == "Bearer"
    assert json_data["data"]["user"]["email"] == "login_test@plant.com"
    assert "password_hash" not in json_data["data"]["user"]

def test_login_invalid_password(client):
    """Test login with wrong password returns 401 Unauthorized."""
    client.post("/api/auth/register", json={
        "email": "wrongpass@plant.com",
        "password": "CorrectPass123!",
        "full_name": "Test User"
    })

    response = client.post("/api/auth/login", json={
        "email": "wrongpass@plant.com",
        "password": "WrongPassword123!"
    })
    assert response.status_code == 401
    json_data = response.get_json()
    assert json_data["success"] is False
    assert json_data["error_code"] == "INVALID_CREDENTIALS"

def test_login_nonexistent_user(client):
    """Test login with unregistered email returns 401 Unauthorized."""
    response = client.post("/api/auth/login", json={
        "email": "ghost@plant.com",
        "password": "SomePassword123!"
    })
    assert response.status_code == 401
    assert response.get_json()["error_code"] == "INVALID_CREDENTIALS"

def test_refresh_token(client):
    """Test token refresh endpoint with valid refresh token."""
    # Register & Login
    client.post("/api/auth/register", json={
        "email": "refresh_test@plant.com",
        "password": "RefreshPass123!",
        "full_name": "Refresh User"
    })
    login_res = client.post("/api/auth/login", json={
        "email": "refresh_test@plant.com",
        "password": "RefreshPass123!"
    })
    refresh_token = login_res.get_json()["data"]["refresh_token"]

    # Call refresh endpoint with refresh token
    refresh_res = client.post(
        "/api/auth/refresh",
        headers={"Authorization": f"Bearer {refresh_token}"}
    )
    assert refresh_res.status_code == 200
    json_data = refresh_res.get_json()
    assert json_data["success"] is True
    assert "access_token" in json_data["data"]

def test_refresh_with_access_token_fails(client):
    """Test that using an access token on the refresh endpoint is rejected."""
    client.post("/api/auth/register", json={
        "email": "refresh_fail@plant.com",
        "password": "RefreshPass123!",
        "full_name": "Refresh Fail User"
    })
    login_res = client.post("/api/auth/login", json={
        "email": "refresh_fail@plant.com",
        "password": "RefreshPass123!"
    })
    access_token = login_res.get_json()["data"]["access_token"]

    # Try refreshing using access token
    res = client.post(
        "/api/auth/refresh",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert res.status_code == 401
    assert res.get_json()["error_code"] == "INVALID_TOKEN"

def test_logout_revokes_token(client):
    """Test that logging out revokes the active token and blocks further access."""
    # Register & Login
    client.post("/api/auth/register", json={
        "email": "logout_test@plant.com",
        "password": "LogoutPass123!",
        "full_name": "Logout User"
    })
    login_res = client.post("/api/auth/login", json={
        "email": "logout_test@plant.com",
        "password": "LogoutPass123!"
    })
    access_token = login_res.get_json()["data"]["access_token"]
    auth_headers = {"Authorization": f"Bearer {access_token}"}

    # Verify token works for /api/auth/me
    me_res1 = client.get("/api/auth/me", headers=auth_headers)
    assert me_res1.status_code == 200

    # Logout
    logout_res = client.post("/api/auth/logout", headers=auth_headers)
    assert logout_res.status_code == 200

    # Verify token is now revoked and rejected
    me_res2 = client.get("/api/auth/me", headers=auth_headers)
    assert me_res2.status_code == 401
    assert me_res2.get_json()["error_code"] == "TOKEN_REVOKED"

def test_get_me_success(client, engineer_user):
    """Test /api/auth/me returns the authenticated user."""
    response = client.get("/api/auth/me", headers=engineer_user["headers"])
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data["success"] is True
    assert json_data["data"]["email"] == "engineer1@plant.com"
    assert json_data["data"]["role"] == UserRole.ENGINEER

def test_get_me_unauthorized(client):
    """Test /api/auth/me without token returns 401 Unauthorized."""
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    json_data = response.get_json()
    assert json_data["success"] is False
    assert json_data["error_code"] == "AUTHORIZATION_REQUIRED"
