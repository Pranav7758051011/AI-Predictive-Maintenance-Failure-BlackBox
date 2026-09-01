import os
import sys
import pytest
import mongomock
from flask_jwt_extended import create_access_token

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
from app.database import MongoManager
from app.services.auth_service import AuthService
from app.utils.constants import UserRole

@pytest.fixture(scope="session")
def mock_mongo_client():
    """Provides an isolated in-memory MongoClient using mongomock."""
    client = mongomock.MongoClient()
    return client

@pytest.fixture(scope="function")
def app(mock_mongo_client):
    """Creates a Flask application instance configured for testing."""
    test_config = {
        "TESTING": True,
        "ENV": "testing",
        "MONGO_DB_NAME": "ai_pm_test_db",
        "MONGO_MOCK_CLIENT": mock_mongo_client,
        "JWT_SECRET_KEY": "test-jwt-secret-key-12345-very-long-and-secure-32bytes",
        "SECRET_KEY": "test-flask-secret-key-12345-very-long-and-secure-32bytes"
    }
    
    app_instance = create_app("testing", custom_config=test_config)
    
    with app_instance.app_context():
        db = MongoManager.get_db()
        if db is not None:
            for col_name in db.list_collection_names():
                db[col_name].drop()
                
    yield app_instance

@pytest.fixture(scope="function")
def client(app):
    """Provides a Flask test HTTP client."""
    return app.test_client()

@pytest.fixture(scope="function")
def db(app):
    """Provides the active test database."""
    with app.app_context():
        return MongoManager.get_db()

@pytest.fixture(scope="function")
def auth_service(app):
    return AuthService()

@pytest.fixture(scope="function")
def admin_user(app, auth_service):
    """Creates an Admin user in test DB and returns user data + access token."""
    user = auth_service.register({
        "email": "admin@plant.com",
        "password": "AdminPassword123!",
        "full_name": "Chief Administrator",
        "role": UserRole.ADMIN
    })
    with app.app_context():
        token = create_access_token(
            identity=str(user["id"]),
            additional_claims={"role": UserRole.ADMIN, "email": user["email"]}
        )
    return {
        "user": user,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"}
    }

@pytest.fixture(scope="function")
def engineer_user(app, auth_service):
    """Creates an Engineer user in test DB and returns user data + access token."""
    user = auth_service.register({
        "email": "engineer1@plant.com",
        "password": "EngineerPassword123!",
        "full_name": "Lead Engineer",
        "role": UserRole.ENGINEER
    })
    with app.app_context():
        token = create_access_token(
            identity=str(user["id"]),
            additional_claims={"role": UserRole.ENGINEER, "email": user["email"]}
        )
    return {
        "user": user,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"}
    }

@pytest.fixture(scope="function")
def second_engineer_user(app, auth_service):
    """Creates a second Engineer user in test DB for assignment isolation checks."""
    user = auth_service.register({
        "email": "engineer2@plant.com",
        "password": "Engineer2Password123!",
        "full_name": "Field Engineer 2",
        "role": UserRole.ENGINEER
    })
    with app.app_context():
        token = create_access_token(
            identity=str(user["id"]),
            additional_claims={"role": UserRole.ENGINEER, "email": user["email"]}
        )
    return {
        "user": user,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"}
    }

@pytest.fixture(scope="function")
def viewer_user(app, auth_service):
    """Creates a Viewer user in test DB and returns user data + access token."""
    user = auth_service.register({
        "email": "viewer@plant.com",
        "password": "ViewerPassword123!",
        "full_name": "Plant Viewer",
        "role": UserRole.VIEWER
    })
    with app.app_context():
        token = create_access_token(
            identity=str(user["id"]),
            additional_claims={"role": UserRole.VIEWER, "email": user["email"]}
        )
    return {
        "user": user,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"}
    }
