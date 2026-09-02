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

def seed_initial_data(app: Flask):
    """Automatically seeds default demo accounts and machines if database is empty."""
    try:
        from app.database import MongoManager
        db = MongoManager.get_db()
        if db is None:
            return
            
        users_col = db["users"]
        
        # 1. Admin Account
        if users_col.count_documents({"email": "admin.plant@factory.io"}) == 0:
            admin_hash = bcrypt.generate_password_hash("SecureAdminPassword123!").decode("utf-8")
            users_col.insert_one({
                "email": "admin.plant@factory.io",
                "password_hash": admin_hash,
                "full_name": "Chief Plant Admin",
                "role": "ADMIN",
                "is_active": True
            })
            
        # 2. Lead Engineer Account
        if users_col.count_documents({"email": "engineer.lead@factory.io"}) == 0:
            eng_hash = bcrypt.generate_password_hash("SecureEngineerPassword123!").decode("utf-8")
            users_col.insert_one({
                "email": "engineer.lead@factory.io",
                "password_hash": eng_hash,
                "full_name": "Senior Reliability Engineer",
                "role": "ENGINEER",
                "is_active": True
            })
            
        # 3. Client / Viewer Account
        if users_col.count_documents({"email": "viewer.observer@factory.io"}) == 0:
            view_hash = bcrypt.generate_password_hash("SecureViewerPassword123!").decode("utf-8")
            users_col.insert_one({
                "email": "viewer.observer@factory.io",
                "password_hash": view_hash,
                "full_name": "Client Observer",
                "role": "CLIENT",
                "is_active": True
            })

        # 4. Seed Baseline Fleet if empty
        machines_col = db["machines"]
        if machines_col.count_documents({}) == 0:
            machines_col.insert_many([
                {"serial_number": "CNC-204", "name": "5-Axis Heavy CNC Milling Center", "product_type": "M", "location": "Bay 4 - Sector A", "status": "HEALTHY", "current_health_score": 98.0},
                {"serial_number": "PRESS-102", "name": "Hydraulic Stamping Press", "product_type": "H", "location": "Bay 2 - Press Bay", "status": "HEALTHY", "current_health_score": 95.0},
                {"serial_number": "MOTOR-308", "name": "High-Power Induction Drive Motor", "product_type": "L", "location": "Bay 1 - Powerhouse", "status": "WARNING", "current_health_score": 62.0}
            ])
    except Exception as e:
        app.logger.warning(f"Initial data seed check: {e}")

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
    
    # 7. Auto-seed demo accounts & fleet
    seed_initial_data(app)
    
    app.logger.info(
        f"Application initialized successfully in '{app.config.get('ENV')}' environment."
    )
    
    return app
