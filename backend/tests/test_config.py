import pytest
from config import get_config, DevelopmentConfig, TestingConfig, ProductionConfig, BaseConfig

def test_development_config():
    config = get_config("development")
    assert config.DEBUG is True
    assert config.TESTING is False
    assert config.MONGO_DB_NAME == "ai_predictive_maintenance"

def test_testing_config():
    config = get_config("testing")
    assert config.DEBUG is False
    assert config.TESTING is True
    assert config.MONGO_DB_NAME == "ai_pm_test_db"

def test_production_config():
    config = get_config("production")
    assert config.DEBUG is False
    assert config.TESTING is False

def test_default_config():
    config = get_config("nonexistent_env")
    assert config == DevelopmentConfig

def test_cors_origins_parsing():
    config = BaseConfig()
    assert isinstance(config.CORS_ORIGINS, list)
    assert len(config.CORS_ORIGINS) > 0

def test_swagger_specs_config():
    config = BaseConfig()
    assert "openapi" in config.SWAGGER
    assert config.SWAGGER["openapi"] == "3.0.2"
    assert config.SWAGGER["specs_route"] == "/api/docs/"
