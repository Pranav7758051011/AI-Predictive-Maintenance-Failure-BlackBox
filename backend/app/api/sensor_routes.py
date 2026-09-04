from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app.services.sensor_service import SensorService
from app.schemas.sensor_schema import (
    SensorIngestRequestSchema,
    SensorBatchIngestRequestSchema,
    SensorResponseSchema,
    SensorHistoryQuerySchema,
    MachineMonitoringResponseSchema
)
from app.middleware.auth_middleware import role_required, get_current_user
from app.utils.constants import UserRole
from app.utils.response_helpers import success_response, error_response

sensor_bp = Blueprint("sensors", __name__, url_prefix="/api/machines/<machine_id>")
sensor_service = SensorService()

ingest_schema = SensorIngestRequestSchema()
batch_ingest_schema = SensorBatchIngestRequestSchema()
sensor_response_schema = SensorResponseSchema()
history_query_schema = SensorHistoryQuerySchema()
monitoring_response_schema = MachineMonitoringResponseSchema()

@sensor_bp.route("/sensors", methods=["POST"])
@jwt_required(optional=True)
def ingest_sensor_data(machine_id: str):
    """
    Ingest Sensor Telemetry
    ---
    tags:
      - Sensors
    summary: Ingest single telemetry reading for a machine
    security:
      - BearerAuth: []
    parameters:
      - name: machine_id
        in: path
        required: true
        schema:
          type: string
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - air_temp
              - process_temp
              - rotational_speed
              - torque
              - tool_wear
            properties:
              air_temp:
                type: number
                example: 298.1
                description: Air temperature in Kelvin
              process_temp:
                type: number
                example: 308.6
                description: Process temperature in Kelvin
              rotational_speed:
                type: number
                example: 1551.0
                description: Rotational speed in RPM
              torque:
                type: number
                example: 42.8
                description: Torque in Nm
              tool_wear:
                type: number
                example: 120.0
                description: Tool wear in minutes
              product_type:
                type: string
                enum: [L, M, H]
                example: M
              timestamp:
                type: string
                example: "2026-09-01T14:30:00Z"
    responses:
      201:
        description: Telemetry recorded successfully
      403:
        description: Forbidden
      404:
        description: Machine not found
      422:
        description: Validation error
    """
    current_user = get_current_user(optional=True)
    payload = request.get_json() or {}
    validated_data = ingest_schema.load(payload)
    
    record = sensor_service.ingest_telemetry(machine_id, validated_data, current_user)
    return success_response(
        data=sensor_response_schema.dump(record),
        message="Sensor telemetry recorded successfully.",
        status_code=201
    )

@sensor_bp.route("/sensors/batch", methods=["POST"])
@jwt_required(optional=True)
def ingest_sensor_batch(machine_id: str):
    """
    Batch Ingest Sensor Telemetry
    ---
    tags:
      - Sensors
    summary: Bulk ingest multiple telemetry readings for a machine
    security:
      - BearerAuth: []
    parameters:
      - name: machine_id
        in: path
        required: true
        schema:
          type: string
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - readings
            properties:
              readings:
                type: array
                items:
                  type: object
                  required:
                    - air_temp
                    - process_temp
                    - rotational_speed
                    - torque
                    - tool_wear
                  properties:
                    air_temp:
                      type: number
                      example: 298.1
                    process_temp:
                      type: number
                      example: 308.6
                    rotational_speed:
                      type: number
                      example: 1551.0
                    torque:
                      type: number
                      example: 42.8
                    tool_wear:
                      type: number
                      example: 120.0
                    timestamp:
                      type: string
                      example: "2026-09-01T14:30:00Z"
    responses:
      201:
        description: Batch telemetry ingested successfully
      403:
        description: Forbidden
      404:
        description: Machine not found
      422:
        description: Validation error
    """
    current_user = get_current_user(optional=True)
    payload = request.get_json() or {}
    validated_data = batch_ingest_schema.load(payload)
    
    result = sensor_service.ingest_telemetry_batch(
        machine_id=machine_id,
        readings=validated_data["readings"],
        current_user=current_user
    )
    result["items"] = sensor_response_schema.dump(result["items"], many=True)
    
    return success_response(
        data=result,
        message=f"Successfully ingested batch of {result['inserted_count']} telemetry records.",
        status_code=201
    )

@sensor_bp.route("/sensors/latest", methods=["GET"])
@jwt_required(optional=True)
def get_latest_sensor_data(machine_id: str):
    """
    Get Latest Sensor Reading
    ---
    tags:
      - Sensors
    summary: Retrieve the most recent telemetry sample for a machine
    security:
      - BearerAuth: []
    parameters:
      - name: machine_id
        in: path
        required: true
        schema:
          type: string
    responses:
      200:
        description: Latest telemetry record
      404:
        description: Machine or telemetry not found
    """
    current_user = get_current_user(optional=True)
    latest = sensor_service.get_latest_telemetry(machine_id, current_user)
    
    if not latest:
        return error_response(
            message=f"No telemetry data available for machine '{machine_id}'.",
            error_code="NO_TELEMETRY_DATA",
            status_code=404
        )
        
    return success_response(
        data=sensor_response_schema.dump(latest),
        message="Latest telemetry retrieved successfully.",
        status_code=200
    )

@sensor_bp.route("/sensors", methods=["GET"])
@jwt_required(optional=True)
def get_sensor_history(machine_id: str):
    """
    Get Sensor Telemetry History
    ---
    tags:
      - Sensors
    summary: Query historical telemetry with pagination and date range filters
    security:
      - BearerAuth: []
    parameters:
      - name: machine_id
        in: path
        required: true
        schema:
          type: string
      - name: page
        in: query
        schema:
          type: integer
          default: 1
      - name: page_size
        in: query
        schema:
          type: integer
          default: 50
      - name: start_time
        in: query
        schema:
          type: string
          example: "2026-09-01T00:00:00Z"
      - name: end_time
        in: query
        schema:
          type: string
          example: "2026-09-01T23:59:59Z"
      - name: sort_order
        in: query
        schema:
          type: string
          enum: [asc, desc]
          default: desc
    responses:
      200:
        description: Paginated historical telemetry
      404:
        description: Machine not found
    """
    current_user = get_current_user(optional=True)
    query_params = history_query_schema.load(request.args.to_dict())
    
    result = sensor_service.get_telemetry_history(machine_id, query_params, current_user)
    result["items"] = sensor_response_schema.dump(result["items"], many=True)
    
    return success_response(
        data=result,
        message="Telemetry history retrieved successfully.",
        status_code=200
    )

@sensor_bp.route("/monitoring", methods=["GET"])
@jwt_required(optional=True)
def get_machine_monitoring(machine_id: str):
    """
    Machine Real-Time Monitoring Cockpit
    ---
    tags:
      - Sensors
    summary: Retrieve live telemetry status, latest reading, and recent time-series samples
    security:
      - BearerAuth: []
    parameters:
      - name: machine_id
        in: path
        required: true
        schema:
          type: string
    responses:
      200:
        description: Real-time monitoring data
      404:
        description: Machine not found
    """
    current_user = get_current_user(optional=True)
    monitoring_data = sensor_service.get_monitoring_data(machine_id, current_user)
    
    return success_response(
        data=monitoring_response_schema.dump(monitoring_data),
        message="Machine monitoring data retrieved successfully.",
        status_code=200
    )
