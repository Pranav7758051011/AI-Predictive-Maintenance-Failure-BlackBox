import time
from datetime import datetime, timezone
from flask import Blueprint, current_app
from app.database import MongoManager
from app.utils.response_helpers import success_response, error_response

health_bp = Blueprint("health", __name__)
START_TIME = time.time()

@health_bp.route("/health", methods=["GET"])
@health_bp.route("/api/health", methods=["GET"])
def check_health():
    """
    System Health & Diagnostic Check
    ---
    tags:
      - Health
    summary: Returns service operational status and MongoDB connectivity
    description: Verifies backend API readiness, active environment, process uptime, and live MongoDB ping latency.
    responses:
      200:
        description: System is operational and healthy
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                  example: true
                message:
                  type: string
                  example: System is healthy and operational
                data:
                  type: object
                  properties:
                    status:
                      type: string
                      example: healthy
                    environment:
                      type: string
                      example: development
                    version:
                      type: string
                      example: 1.0.0
                    timestamp:
                      type: string
                      example: 2026-09-01T14:30:00Z
                    uptime_seconds:
                      type: number
                      example: 125.4
                    database:
                      type: object
                      properties:
                        status:
                          type: string
                          example: connected
                        database:
                          type: string
                          example: ai_predictive_maintenance
                        latency_ms:
                          type: number
                          example: 2.34
      503:
        description: System is degraded (e.g. database unreachable)
    """
    db_ping = MongoManager.ping()
    uptime = round(time.time() - START_TIME, 2)
    is_healthy = db_ping.get("status") == "connected"

    health_data = {
        "status": "healthy" if is_healthy else "degraded",
        "service": "AI-Predictive-Maintenance-Failure-BlackBox",
        "version": "1.0.0",
        "environment": current_app.config.get("ENV", "unknown"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": uptime,
        "database": db_ping
    }

    if is_healthy:
        return success_response(
            data=health_data,
            message="System is healthy and operational",
            status_code=200
        )
    else:
        return error_response(
            message="System is running with degraded dependencies (database offline)",
            error_code="SERVICE_DEGRADED",
            status_code=503,
            errors=health_data
        )

@health_bp.route("/", methods=["GET"])
def root_info():
    """
    API Root Information
    ---
    tags:
      - Health
    summary: Root welcome and API discovery endpoint
    responses:
      200:
        description: Service discovery details
    """
    return success_response(
        data={
            "name": "AI Predictive Maintenance with Failure Black Box API",
            "version": "1.0.0",
            "documentation": "/api/docs/",
            "health_check": "/api/health",
            "status": "online"
        },
        message="Welcome to AI Predictive Maintenance API"
    )
