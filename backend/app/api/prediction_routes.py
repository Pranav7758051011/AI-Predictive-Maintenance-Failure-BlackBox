from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app.services.prediction_service import PredictionService
from app.schemas.prediction_schema import (
    PredictionRequestSchema,
    PredictionResponseSchema,
    MachineHealthResponseSchema,
    PredictionListQuerySchema
)
from app.middleware.auth_middleware import role_required, get_current_user
from app.utils.constants import UserRole
from app.utils.response_helpers import success_response

prediction_bp = Blueprint("predictions", __name__)
prediction_service = PredictionService()

pred_req_schema = PredictionRequestSchema()
pred_res_schema = PredictionResponseSchema()
health_res_schema = MachineHealthResponseSchema()
query_schema = PredictionListQuerySchema()

@prediction_bp.route("/api/predictions", methods=["POST"])
@jwt_required(optional=True)
def create_prediction():
    """
    Run ML Failure Prediction on Telemetry
    ---
    tags:
      - Predictions
    summary: Run ML failure inference and health score calculation on provided sensor telemetry
    security:
      - BearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - machine_id
              - telemetry
            properties:
              machine_id:
                type: string
                example: "507f1f77bcf86cd799439011"
              threshold:
                type: number
                example: 0.50
                description: Custom failure classification threshold
              telemetry:
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
                  product_type:
                    type: string
                    example: M
    responses:
      201:
        description: Prediction generated successfully
      403:
        description: Forbidden
      404:
        description: Machine not found
      422:
        description: Validation error
    """
    current_user = get_current_user(optional=True)
    payload = request.get_json() or {}
    validated_data = pred_req_schema.load(payload)

    result = prediction_service.predict_from_telemetry(
        machine_id=validated_data["machine_id"],
        telemetry_data=validated_data["telemetry"],
        current_user=current_user,
        threshold=validated_data.get("threshold")
    )

    return success_response(
        data=pred_res_schema.dump(result),
        message="AI/ML prediction generated successfully.",
        status_code=201
    )

@prediction_bp.route("/api/machines/<machine_id>/predictions", methods=["POST"])
@jwt_required(optional=True)
def create_prediction_from_latest_telemetry(machine_id: str):
    """
    Generate Prediction from Machine's Latest Telemetry
    ---
    tags:
      - Predictions
    summary: Run ML inference using the most recent sensor reading stored for this machine
    security:
      - BearerAuth: []
    parameters:
      - name: machine_id
        in: path
        required: true
        schema:
          type: string
    responses:
      201:
        description: Prediction generated successfully
      403:
        description: Forbidden
      404:
        description: Machine or latest telemetry not found
    """
    current_user = get_current_user(optional=True)
    payload = request.get_json() or {}
    threshold = payload.get("threshold")

    result = prediction_service.predict_from_latest_telemetry(
        machine_id=machine_id,
        current_user=current_user,
        threshold=threshold
    )

    return success_response(
        data=pred_res_schema.dump(result),
        message="AI/ML prediction generated from latest telemetry successfully.",
        status_code=201
    )

@prediction_bp.route("/api/predictions", methods=["GET"])
@jwt_required(optional=True)
def list_predictions():
    """
    List Prediction History
    ---
    tags:
      - Predictions
    summary: Query historical AI/ML predictions with filtering and pagination
    security:
      - BearerAuth: []
    parameters:
      - name: machine_id
        in: query
        schema:
          type: string
      - name: failure_only
        in: query
        schema:
          type: boolean
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
      - name: end_time
        in: query
        schema:
          type: string
    responses:
      200:
        description: Paginated predictions
    """
    current_user = get_current_user(optional=True)
    query_params = query_schema.load(request.args.to_dict())

    result = prediction_service.list_predictions(query_params, current_user)
    result["items"] = pred_res_schema.dump(result["items"], many=True)

    return success_response(
        data=result,
        message="Predictions history retrieved successfully.",
        status_code=200
    )

@prediction_bp.route("/api/predictions/<prediction_id>", methods=["GET"])
@jwt_required(optional=True)
def get_prediction(prediction_id: str):
    """
    Get Prediction by ID
    ---
    tags:
      - Predictions
    summary: Retrieve detailed prediction record
    security:
      - BearerAuth: []
    parameters:
      - name: prediction_id
        in: path
        required: true
        schema:
          type: string
    responses:
      200:
        description: Prediction details
      404:
        description: Prediction not found
    """
    current_user = get_current_user(optional=True)
    pred = prediction_service.get_prediction_by_id(prediction_id, current_user)
    return success_response(
        data=pred_res_schema.dump(pred),
        message="Prediction details retrieved successfully.",
        status_code=200
    )

@prediction_bp.route("/api/machines/<machine_id>/predictions", methods=["GET"])
@jwt_required(optional=True)
def get_machine_predictions(machine_id: str):
    """
    Get Machine Prediction History
    ---
    tags:
      - Predictions
    summary: Retrieve predictions specifically for a single machine
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
    responses:
      200:
        description: Paginated predictions for machine
      404:
        description: Machine not found
    """
    current_user = get_current_user(optional=True)
    params = request.args.to_dict()
    params["machine_id"] = machine_id
    query_params = query_schema.load(params)

    result = prediction_service.list_predictions(query_params, current_user)
    result["items"] = pred_res_schema.dump(result["items"], many=True)

    return success_response(
        data=result,
        message="Machine predictions retrieved successfully.",
        status_code=200
    )

@prediction_bp.route("/api/machines/<machine_id>/health", methods=["GET"])
@jwt_required(optional=True)
def get_machine_health(machine_id: str):
    """
    Get Current Machine Health Score & Status
    ---
    tags:
      - Predictions
    summary: Retrieve real-time health score, failure risk, and failure diagnosis
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
        description: Current health status
      404:
        description: Machine or prediction data not found
    """
    current_user = get_current_user(optional=True)
    health_data = prediction_service.get_machine_health(machine_id, current_user)
    return success_response(
        data=health_res_schema.dump(health_data),
        message="Current machine health retrieved successfully.",
        status_code=200
    )

@prediction_bp.route("/api/machines/<machine_id>/risk", methods=["GET"])
@jwt_required(optional=True)
def get_machine_risk(machine_id: str):
    """
    Get Machine Risk Overview
    ---
    tags:
      - Predictions
    summary: Alias endpoint for machine risk level and failure classification
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
        description: Machine risk overview
      404:
        description: Machine or prediction data not found
    """
    current_user = get_current_user(optional=True)
    health_data = prediction_service.get_machine_health(machine_id, current_user)
    return success_response(
        data=health_res_schema.dump(health_data),
        message="Machine risk status retrieved successfully.",
        status_code=200
    )
