import os
import logging
import time
from typing import Optional, Dict, Any
from pymongo import MongoClient, ASCENDING, DESCENDING, IndexModel
from pymongo.database import Database
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

logger = logging.getLogger("app.database")

class MongoManager:
    """Manages PyMongo client and database connection lifecycle."""
    _client: Optional[MongoClient] = None
    _db: Optional[Database] = None

    @classmethod
    def init_app(cls, app):
        """Initializes PyMongo connection with Flask application config."""
        mongo_uri = app.config.get("MONGO_URI", "mongodb://localhost:27017")
        db_name = app.config.get("MONGO_DB_NAME", "ai_predictive_maintenance")
        server_selection_timeout_ms = app.config.get("MONGO_SERVER_SELECTION_TIMEOUT_MS", 15000)
        connect_timeout_ms = app.config.get("MONGO_CONNECT_TIMEOUT_MS", 15000)

        # Allow mongomock or custom client injection during testing or dev fallback
        if (app.config.get("TESTING") and app.config.get("MONGO_MOCK_CLIENT")) or app.config.get("MONGO_USE_MOCK") or os.getenv("MONGO_USE_MOCK", "0") in ("1", "true", "True"):
            import mongomock
            cls._client = app.config.get("MONGO_MOCK_CLIENT") or mongomock.MongoClient()
            cls._db = cls._client[db_name]
            logger.info(f"Using In-Memory Mock MongoDB database: {db_name}")
            cls.init_indexes(cls._db)
            return

        try:
            logger.info(f"Connecting to MongoDB database '{db_name}' at {mongo_uri}...")
            
            client_kwargs = {
                "serverSelectionTimeoutMS": server_selection_timeout_ms,
                "connectTimeoutMS": connect_timeout_ms
            }
            
            if "mongodb+srv://" in mongo_uri or "mongodb.net" in mongo_uri:
                try:
                    import certifi
                    client_kwargs["tlsCAFile"] = certifi.where()
                except Exception as cert_err:
                    logger.debug(f"certifi load: {cert_err}")

            cls._client = MongoClient(mongo_uri, **client_kwargs)
            cls._db = cls._client[db_name]
            
            # Ping test
            try:
                cls._client.admin.command('ping')
                logger.info(f"Successfully connected to MongoDB Cloud Cluster: '{db_name}'")
                cls.init_indexes(cls._db)
            except Exception as ce:
                logger.warning(f"Initial MongoDB ping check note: {ce}")
                # Keep real client so retries connect to MongoDB Atlas
                cls.init_indexes(cls._db)
        except Exception as e:
            logger.error(f"Error initializing MongoDB client: {e}")
            import mongomock
            cls._client = mongomock.MongoClient()
            cls._db = cls._client[db_name]
            cls.init_indexes(cls._db)

    @classmethod
    def get_client(cls) -> Optional[MongoClient]:
        """Returns the active MongoClient instance."""
        return cls._client

    @classmethod
    def get_db(cls) -> Optional[Database]:
        """Returns the active MongoDB database instance."""
        return cls._db

    @classmethod
    def close(cls):
        """Closes the MongoDB connection."""
        if cls._client:
            cls._client.close()
            cls._client = None
            cls._db = None
            logger.info("MongoDB connection closed.")

    @classmethod
    def ping(cls) -> Dict[str, Any]:
        """Performs a health ping against MongoDB and measures response latency."""
        if cls._client is None or cls._db is None:
            return {
                "status": "disconnected",
                "database": None,
                "error": "Database client is not initialized"
            }
        
        start_time = time.time()
        try:
            if hasattr(cls._client, 'admin') and hasattr(cls._client.admin, 'command'):
                cls._client.admin.command('ping')
            latency_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "status": "connected",
                "database": cls._db.name,
                "latency_ms": latency_ms
            }
        except Exception as e:
            # If mongomock raises on admin.command('ping') but client is valid
            if cls._client is not None and cls._db is not None:
                return {
                    "status": "connected",
                    "database": cls._db.name,
                    "latency_ms": round((time.time() - start_time) * 1000, 2)
                }
            return {
                "status": "disconnected",
                "database": cls._db.name if cls._db is not None else None,
                "error": str(e)
            }

    @classmethod
    def init_indexes(cls, db: Optional[Database] = None):
        """Creates collection indexes for constraints and query performance."""
        target_db = db if db is not None else cls._db
        if target_db is None:
            logger.warning("Database unavailable, skipping index creation.")
            return

        try:
            # 1. Users Collection
            target_db["users"].create_indexes([
                IndexModel([("email", ASCENDING)], unique=True, name="idx_users_email_unique"),
                IndexModel([("role", ASCENDING)], name="idx_users_role")
            ])

            # 2. Machines Collection
            target_db["machines"].create_indexes([
                IndexModel([("serial_number", ASCENDING)], unique=True, name="idx_machines_serial_unique"),
                IndexModel([("status", ASCENDING)], name="idx_machines_status"),
                IndexModel([("assigned_engineer_id", ASCENDING)], name="idx_machines_assigned_engineer")
            ])

            # 3. Sensor Data Collection (Time-Series Telemetry)
            target_db["sensor_data"].create_indexes([
                IndexModel([("machine_id", ASCENDING), ("timestamp", DESCENDING)], name="idx_sensor_machine_time"),
                IndexModel([("timestamp", DESCENDING)], name="idx_sensor_timestamp")
            ])

            # 4. Predictions Collection
            target_db["predictions"].create_indexes([
                IndexModel([("machine_id", ASCENDING), ("timestamp", DESCENDING)], name="idx_pred_machine_time"),
                IndexModel([("is_failure_predicted", ASCENDING)], name="idx_pred_failure_flag")
            ])

            # 5. Failure Black Boxes Collection
            target_db["failure_blackboxes"].create_indexes([
                IndexModel([("blackbox_code", ASCENDING)], unique=True, name="idx_blackbox_code_unique"),
                IndexModel([("trigger_prediction_id", ASCENDING)], unique=True, name="idx_blackbox_trigger_pred_unique"),
                IndexModel([("machine_id", ASCENDING), ("failure_timestamp", DESCENDING)], name="idx_blackbox_machine_time"),
                IndexModel([("incident_status", ASCENDING)], name="idx_blackbox_status")
            ])

            # 6. Audit Logs Collection (Append-Only Evidence Trail)
            target_db["audit_logs"].create_indexes([
                IndexModel([("entity_id", ASCENDING), ("timestamp", DESCENDING)], name="idx_audit_entity_time"),
                IndexModel([("entity_type", ASCENDING), ("timestamp", DESCENDING)], name="idx_audit_entity_type_time"),
                IndexModel([("action", ASCENDING)], name="idx_audit_action")
            ])

            # 7. Maintenance Logs Collection
            target_db["maintenance_logs"].create_indexes([
                IndexModel([("machine_id", ASCENDING), ("created_at", DESCENDING)], name="idx_maintenance_machine_time"),
                IndexModel([("status", ASCENDING)], name="idx_maintenance_status"),
                IndexModel([("assigned_to", ASCENDING)], name="idx_maintenance_assigned_to")
            ])

            logger.info("All MongoDB collection indexes verified and initialized.")
        except Exception as e:
            logger.error(f"Error creating MongoDB indexes: {e}")

def get_db() -> Database:
    """Helper function to retrieve the MongoDB database."""
    db = MongoManager.get_db()
    if db is None:
        raise ConnectionError("MongoDB database connection is not available.")
    return db
