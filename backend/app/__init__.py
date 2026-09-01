import logging
import sys
from typing import Optional, Dict, Any
from flask import Flask
from config import get_config, BaseConfig
from app.extensions import jwt, bcrypt, cors, swagger
from app.database import MongoManager
from app.middleware.error_handlers import register_error_handlers
from app.middleware.request_logger import register_request_logger
from app.utils.response_helpers import error_response

# Blueprints
from app.api.health_routes import health_bp
from app.api.auth_routes import auth_bp
from app.api.user_routes import user_bp
from app.api.machine_routes import machine_bp
from app.api.sensor_routes import sensor_bp
from app.api.prediction_routes import prediction_bp
from app.api.blackbox_routes import blackbox_bp
from app.middleware.auth_middleware import init_jwt_blocklist_loader

def setup_logging(app: Flask):
    """Configures structured logging for the application."""
    log_level = logging.DEBUG if app.config.get("DEBUG") else logging.INFO
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s"
    )
    
    # Stream handler
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    stream_handler.setLevel(log_level)
    
    # Set root and app loggers
    app.logger.setLevel(log_level)
    logging.getLogger().setLevel(log_level)
    if not logging.getLogger().handlers:
        logging.getLogger().addHandler(stream_handler)

def register_jwt_callbacks():
    """Configures JWT error callbacks to return standardized JSON error envelopes."""
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return error_response(
            message="Token has expired. Please refresh or log in again.",
            error_code="TOKEN_EXPIRED",
            status_code=401
        )

    @jwt.invalid_token_loader
    def invalid_token_callback(error_str):
        return error_response(
            message=f"Invalid authorization token: {error_str}",
            error_code="INVALID_TOKEN",
            status_code=401
        )

    @jwt.unauthorized_loader
    def missing_token_callback(error_str):
        return error_response(
            message="Missing authorization header or token.",
            error_code="AUTHORIZATION_REQUIRED",
            status_code=401
        )

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return error_response(
            message="Token has been revoked. Please log in again.",
            error_code="TOKEN_REVOKED",
            status_code=401
        )

def create_app(config_name: Optional[str] = None, custom_config: Optional[Dict[str, Any]] = None) -> Flask:
    """
    Flask Application Factory.
    Initializes configurations, extensions, database connections, middleware, and blueprints.
    """
    app = Flask(__name__)
    
    # 1. Load configuration
    config_obj = get_config(config_name)
    app.config.from_object(config_obj)
    
    if custom_config:
        app.config.update(custom_config)

    # 2. Setup Logging
    setup_logging(app)
    
    # 3. Initialize Extensions
    jwt.init_app(app)
    bcrypt.init_app(app)
    cors.init_app(
        app,
        origins=app.config.get("CORS_ORIGINS", "*"),
        supports_credentials=True
    )
    swagger.init_app(app)
    
    # 4. Initialize Database (PyMongo)
    MongoManager.init_app(app)
    
    # 5. Register Error Handlers & Middleware
    register_error_handlers(app)
    register_request_logger(app)
    register_jwt_callbacks()
    init_jwt_blocklist_loader()
    
    # 6. Register Blueprints
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(machine_bp)
    app.register_blueprint(sensor_bp)
    app.register_blueprint(prediction_bp)
    app.register_blueprint(blackbox_bp)
    
    app.logger.info(
        f"Application initialized successfully in '{app.config.get('ENV')}' environment."
    )
    
    return app
