import os
from datetime import timedelta
from dotenv import load_dotenv

# Load .env if present
load_dotenv()

class BaseConfig:
    """Base configuration loaded across all environments."""
    ENV = os.getenv("FLASK_ENV", "development")
    DEBUG = os.getenv("FLASK_DEBUG", "False").lower() in ("true", "1", "yes")
    TESTING = False
    
    # Secrets
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-fallback-secret-key-change-in-prod-xyz123")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-fallback-jwt-key-change-in-prod-abc456")
    
    # JWT Expiration times
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        minutes=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES_MINUTES", "60"))
    )
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(
        days=int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES_DAYS", "30"))
    )
    
    # MongoDB settings
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "ai_predictive_maintenance")
    MONGO_CONNECT_TIMEOUT_MS = 3000
    MONGO_SERVER_SELECTION_TIMEOUT_MS = 3000

    # CORS settings
    CORS_ORIGINS = [
        origin.strip() 
        for origin in os.getenv(
            "CORS_ORIGINS", 
            "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"
        ).split(",") if origin.strip()
    ]

    # Flasgger / Swagger UI configuration
    SWAGGER = {
        "title": "AI Predictive Maintenance with Failure Black Box API",
        "uiversion": 3,
        "openapi": "3.0.2",
        "description": "Industrial AI API for real-time machine telemetry, health scoring, RUL forecasting, and Failure Black Box incident recording & replay.",
        "version": "1.0.0",
        "termsOfService": "",
        "contact": {
            "name": "Predictive Maintenance Engineering Team",
            "url": "https://github.com/Pranav7758051011/AI-Predictive-Maintenance-Failure-BlackBox"
        },
        "components": {
            "securitySchemes": {
                "BearerAuth": {
                    "type": "http",
                    "scheme": "bearer",
                    "bearerFormat": "JWT",
                    "description": "Enter your JWT token to authenticate (Bearer <token>)"
                }
            }
        },
        "security": [{"BearerAuth": []}],
        "specs_route": "/api/docs/"
    }

class DevelopmentConfig(BaseConfig):
    """Development configuration."""
    DEBUG = True
    TESTING = False

class TestingConfig(BaseConfig):
    """Testing configuration with isolated test database."""
    DEBUG = False
    TESTING = True
    MONGO_DB_NAME = "ai_pm_test_db"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=1)
    # Fast timeouts for testing
    MONGO_CONNECT_TIMEOUT_MS = 1000
    MONGO_SERVER_SELECTION_TIMEOUT_MS = 1000

class ProductionConfig(BaseConfig):
    """Production configuration."""
    DEBUG = False
    TESTING = False
    # In production, strict enforcement of secure secrets
    if os.getenv("SECRET_KEY") == "dev-fallback-secret-key-change-in-prod-xyz123":
        raise ValueError("CRITICAL: Production SECRET_KEY must be set in environment variables!")

config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig
}

def get_config(env_name: str = None) -> BaseConfig:
    """Helper to retrieve configuration class by environment name."""
    if not env_name:
        env_name = os.getenv("FLASK_ENV", "development").lower()
    return config_by_name.get(env_name, DevelopmentConfig)
