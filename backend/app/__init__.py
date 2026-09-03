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
    """Automatically seeds default demo accounts, machines, telemetry, and Black Box if empty."""
    try:
        from app.database import MongoManager
        from datetime import datetime, timezone, timedelta
        from bson import ObjectId
        
        db = MongoManager.get_db()
        if db is None:
            return
            
        users_col = db["users"]
        machines_col = db["machines"]
        sensors_col = db["sensor_telemetry"]
        preds_col = db["predictions"]
        blackbox_col = db["failure_blackboxes"]
        
        # 1. Clean up demo admin accounts to make 2 admin registration slots fully available
        users_col.delete_many({"role": "ADMIN"})
            
        # 2. Lead Engineer Account
        engineer_doc = users_col.find_one({"email": "engineer.lead@factory.io"})
        if not engineer_doc:
            eng_hash = bcrypt.generate_password_hash("SecureEngineerPassword123!").decode("utf-8")
            res_eng = users_col.insert_one({
                "email": "engineer.lead@factory.io",
                "password_hash": eng_hash,
                "full_name": "Senior Reliability Engineer",
                "role": "ENGINEER",
                "is_active": True
            })
            engineer_id = res_eng.inserted_id
        else:
            engineer_id = engineer_doc["_id"]
            
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
        if machines_col.count_documents({}) == 0:
            now = datetime.now(timezone.utc)
            m1 = {
                "serial_number": "CNC-204",
                "name": "5-Axis Heavy CNC Milling Center",
                "product_type": "M",
                "location": "Bay 4 - Sector A",
                "status": "HEALTHY",
                "current_health_score": 98.0,
                "assigned_engineer_id": engineer_id,
                "created_at": now,
                "updated_at": now
            }
            m2 = {
                "serial_number": "PRESS-102",
                "name": "Hydraulic Stamping Press",
                "product_type": "H",
                "location": "Bay 2 - Press Bay",
                "status": "HEALTHY",
                "current_health_score": 95.0,
                "assigned_engineer_id": engineer_id,
                "created_at": now,
                "updated_at": now
            }
            m3 = {
                "serial_number": "MOTOR-308",
                "name": "High-Power Induction Drive Motor",
                "product_type": "L",
                "location": "Bay 1 - Powerhouse",
                "status": "CRITICAL",
                "current_health_score": 0.0,
                "assigned_engineer_id": engineer_id,
                "created_at": now,
                "updated_at": now
            }
            res_m = machines_col.insert_many([m1, m2, m3])
            m1_id, m2_id, m3_id = res_m.inserted_ids

            # Seed Telemetry for CNC-204
            sensor_readings = []
            for i in range(12):
                t = now - timedelta(hours=(12 - i))
                sensor_readings.append({
                    "machine_id": m1_id,
                    "timestamp": t,
                    "air_temp": 298.1 + (i * 0.1),
                    "process_temp": 308.6 + (i * 0.15),
                    "rotational_speed": 1550.0 - (i * 2.0),
                    "torque": 42.0 + (i * 0.3),
                    "tool_wear": 20.0 + (i * 5.0),
                    "created_at": t
                })
            # Seed Stress Telemetry for MOTOR-308
            for i in range(12):
                t = now - timedelta(hours=(12 - i))
                is_fail = i >= 10
                sensor_readings.append({
                    "machine_id": m3_id,
                    "timestamp": t,
                    "air_temp": 298.0,
                    "process_temp": 313.5 if is_fail else 310.0,
                    "rotational_speed": 1200.0 if is_fail else 1450.0,
                    "torque": 72.0 if is_fail else 55.0,
                    "tool_wear": 230.0 if is_fail else 180.0,
                    "created_at": t
                })
            sensors_col.insert_many(sensor_readings)

            # Seed Baseline Predictions
            pred_doc = {
                "machine_id": m3_id,
                "failure_probability": 0.9896,
                "failure_prediction": True,
                "failure_type": "Overstrain Failure (OSF)",
                "health_score": 0.0,
                "confidence": 0.9896,
                "model_version": "failure-model-v1.0",
                "feature_snapshot": {
                    "air_temp": 298.0,
                    "process_temp": 313.5,
                    "rotational_speed": 1200.0,
                    "torque": 72.0,
                    "tool_wear": 230.0,
                    "delta_temp": 15.5,
                    "mechanical_power": 9047.78
                },
                "created_at": now
            }
            res_pred = preds_col.insert_one(pred_doc)

            # Seed Initial Black Box Incident
            blackbox_doc = {
                "blackbox_code": "BB-2026-000001",
                "machine_id": m3_id,
                "machine_snapshot": {
                    "name": "High-Power Induction Drive Motor",
                    "serial_number": "MOTOR-308",
                    "product_type": "L",
                    "location": "Bay 1 - Powerhouse"
                },
                "trigger_source": "AUTOMATIC_ML_TRIGGER",
                "failure_timestamp": now,
                "incident_status": "OPEN",
                "failure_summary": {
                    "failure_predicted": True,
                    "failure_type": "Overstrain Failure (OSF)",
                    "failure_probability": 0.9896,
                    "health_score_at_failure": 0.0,
                    "trigger_prediction_id": res_pred.inserted_id
                },
                "telemetry_window": [
                    {
                        "timestamp": (now - timedelta(hours=i)).isoformat(),
                        "air_temp": 298.0,
                        "process_temp": 313.5 if i <= 2 else 309.0,
                        "rotational_speed": 1200.0 if i <= 2 else 1500.0,
                        "torque": 72.0 if i <= 2 else 45.0,
                        "tool_wear": 230.0 if i <= 2 else 150.0,
                        "delta_temp": 15.5 if i <= 2 else 11.0,
                        "mechanical_power": 9047.78,
                        "health_score": 0.0 if i <= 2 else 85.0
                    } for i in range(12, 0, -1)
                ],
                "event_timeline": [
                    {"event_type": "WINDOW_START", "timestamp": (now - timedelta(hours=24)).isoformat(), "description": "24-hour observation window opened."},
                    {"event_type": "HEALTH_DEGRADATION", "timestamp": (now - timedelta(hours=2)).isoformat(), "description": "Machine health score dropped below 50% due to tool wear and torque load."},
                    {"event_type": "FAILURE_DETECTED", "timestamp": now.isoformat(), "description": "XGBoost classified Overstrain Failure (OSF)."},
                    {"event_type": "BLACKBOX_SEALED", "timestamp": now.isoformat(), "description": "Immutable incident snapshot BB-2026-000001 created."}
                ],
                "created_at": now,
                "updated_at": now
            }
            blackbox_col.insert_one(blackbox_doc)
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
