from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app.services.blackbox_service import BlackBoxService
from app.schemas.blackbox_schema import (
    BlackBoxGenerateRequestSchema,
    BlackBoxStatusUpdateRequestSchema,
    BlackBoxResponseSchema,
    BlackBoxReplayResponseSchema,
    BlackBoxListQuerySchema,
    AuditLogResponseSchema
)
from app.middleware.auth_middleware import role_required, get_current_user
from app.utils.constants import UserRole
from app.utils.response_helpers import success_response

blackbox_bp = Blueprint("blackboxes", __name__)
blackbox_service = BlackBoxService()

gen_schema = BlackBoxGenerateRequestSchema()
status_schema = BlackBoxStatusUpdateRequestSchema()
bb_res_schema = BlackBoxResponseSchema()
replay_res_schema = BlackBoxReplayResponseSchema()
query_schema = BlackBoxListQuerySchema()
audit_res_schema = AuditLogResponseSchema()

@blackbox_bp.route("/api/blackboxes/generate", methods=["POST"])
@jwt_required(optional=True)
def generate_blackbox():
    """
    Generate Failure Black Box Incident
    ---
    tags:
      - Black Box
    summary: Manually capture an immutable 24-hour Failure Black Box snapshot for a prediction
    security:
      - BearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - prediction_id
            properties:
              prediction_id:
                type: string
                example: "507f1f77bcf86cd799439011"
    responses:
      201:
        description: Failure Black Box snapshot created
      403:
        description: Forbidden
      404:
        description: Prediction not found
      422:
        description: Validation error
    """
    current_user = get_current_user(optional=True)
    payload = request.get_json() or {}
    validated_data = gen_schema.load(payload)

    blackbox = blackbox_service.generate_blackbox_for_prediction(
        prediction_doc_or_id=validated_data["prediction_id"],
        current_user=current_user,
        is_auto=False
    )

    return success_response(
        data=bb_res_schema.dump(blackbox),
        message=f"Failure Black Box incident '{blackbox['blackbox_code']}' captured successfully.",
        status_code=201
    )

@blackbox_bp.route("/api/blackboxes/simulate", methods=["POST"])
@jwt_required(optional=True)
def simulate_blackbox():
    """
    Simulate Failure Incident & Generate Black Box
    ---
    tags:
      - Black Box
    summary: Simulates progressive telemetry degradation, executes ML prediction, and seals a 24h Failure Black Box
    security:
      - BearerAuth: []
    requestBody:
      required: false
      content:
        application/json:
          schema:
            type: object
            properties:
              machine_id:
                type: string
    responses:
      201:
        description: Failure Black Box snapshot created
    """
    current_user = get_current_user(optional=True)
    payload = request.get_json() or {}
    machine_id = payload.get("machine_id")

    blackbox = blackbox_service.simulate_failure_blackbox(
        machine_id=machine_id,
        current_user=current_user
    )

    return success_response(
        data=bb_res_schema.dump(blackbox),
        message=f"Failure Black Box incident '{blackbox['blackbox_code']}' simulated and sealed successfully.",
        status_code=201
    )

@blackbox_bp.route("/api/blackboxes", methods=["GET"])
@jwt_required(optional=True)
def list_blackboxes():
    """
    List Failure Black Box Incidents
    ---
    tags:
      - Black Box
    summary: Query all historical Failure Black Box incident snapshots
    security:
      - BearerAuth: []
    parameters:
      - name: machine_id
        in: query
        schema:
          type: string
      - name: failure_type
        in: query
        schema:
          type: string
      - name: incident_status
        in: query
        schema:
          type: string
          enum: [OPEN, UNDER_REVIEW, RESOLVED]
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
        description: Paginated Black Box incidents
    """
    current_user = get_current_user(optional=True)
    query_params = query_schema.load(request.args.to_dict())

    result = blackbox_service.list_blackboxes(query_params, current_user)
    result["items"] = bb_res_schema.dump(result["items"], many=True)

    return success_response(
        data=result,
        message="Failure Black Box incidents retrieved successfully.",
        status_code=200
    )

@blackbox_bp.route("/api/blackboxes/<blackbox_id>", methods=["GET"])
@jwt_required(optional=True)
def get_blackbox_by_id(blackbox_id: str):
    """
    Get Failure Black Box Details by ID
    ---
    tags:
      - Black Box
    summary: Retrieve full immutable snapshot of a Black Box incident by database ID
    security:
      - BearerAuth: []
    parameters:
      - name: blackbox_id
        in: path
        required: true
        schema:
          type: string
    responses:
      200:
        description: Black Box incident details
      404:
        description: Black Box not found
    """
    current_user = get_current_user(optional=True)
    bb = blackbox_service.get_blackbox(blackbox_id, current_user)
    return success_response(
        data=bb_res_schema.dump(bb),
        message="Failure Black Box details retrieved successfully.",
        status_code=200
    )

@blackbox_bp.route("/api/blackboxes/code/<blackbox_code>", methods=["GET"])
@jwt_required(optional=True)
def get_blackbox_by_code(blackbox_code: str):
    """
    Get Failure Black Box Details by Code
    ---
    tags:
      - Black Box
    summary: Retrieve full snapshot using human-readable code (e.g. 'BB-2026-000001')
    security:
      - BearerAuth: []
    parameters:
      - name: blackbox_code
        in: path
        required: true
        schema:
          type: string
    responses:
      200:
        description: Black Box incident details
      404:
        description: Black Box code not found
    """
    current_user = get_current_user(optional=True)
    bb = blackbox_service.get_blackbox(blackbox_code, current_user)
    return success_response(
        data=bb_res_schema.dump(bb),
        message="Failure Black Box details retrieved successfully.",
        status_code=200
    )

@blackbox_bp.route("/api/machines/<machine_id>/blackboxes", methods=["GET"])
@jwt_required(optional=True)
def get_machine_blackboxes(machine_id: str):
    """
    Get Machine Black Box Incidents
    ---
    tags:
      - Black Box
    summary: Retrieve all Failure Black Box incidents associated with a specific machine
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
        description: Machine Black Box incidents
      404:
        description: Machine not found
    """
    current_user = get_current_user(optional=True)
    params = request.args.to_dict()
    params["machine_id"] = machine_id
    query_params = query_schema.load(params)

    result = blackbox_service.list_blackboxes(query_params, current_user)
    result["items"] = bb_res_schema.dump(result["items"], many=True)

    return success_response(
        data=result,
        message="Machine Failure Black Boxes retrieved successfully.",
        status_code=200
    )

@blackbox_bp.route("/api/blackboxes/<blackbox_id>/replay", methods=["GET"])
@jwt_required(optional=True)
def get_failure_replay(blackbox_id: str):
    """
    Failure Replay Time-Series Frames
    ---
    tags:
      - Black Box
    summary: Retrieve chronologically ordered 24-hour telemetry and prediction frames for incident playback
    security:
      - BearerAuth: []
    parameters:
      - name: blackbox_id
        in: path
        required: true
        schema:
          type: string
    responses:
      200:
        description: Chronological failure replay frames
      404:
        description: Black Box not found
    """
    current_user = get_current_user(optional=True)
    replay = blackbox_service.get_replay_frames(blackbox_id, current_user)
    return success_response(
        data=replay_res_schema.dump(replay),
        message="Failure replay data retrieved successfully.",
        status_code=200
    )

@blackbox_bp.route("/api/blackboxes/<blackbox_id>/audit", methods=["GET"])
@jwt_required(optional=True)
def get_blackbox_audit(blackbox_id: str):
    """
    Get Failure Black Box Audit Trail
    ---
    tags:
      - Black Box
    summary: Retrieve append-only audit trail logs for a Black Box incident
    security:
      - BearerAuth: []
    parameters:
      - name: blackbox_id
        in: path
        required: true
        schema:
          type: string
    responses:
      200:
        description: Audit trail log entries
      404:
        description: Black Box not found
    """
    current_user = get_current_user(optional=True)
    page = int(request.args.get("page", 1))
    page_size = int(request.args.get("page_size", 50))

    audit_data = blackbox_service.get_audit_trail(blackbox_id, current_user, page=page, page_size=page_size)
    audit_data["items"] = audit_res_schema.dump(audit_data["items"], many=True)

    return success_response(
        data=audit_data,
        message="Black Box audit trail retrieved successfully.",
        status_code=200
    )

@blackbox_bp.route("/api/blackboxes/<blackbox_id>/status", methods=["PATCH"])
@jwt_required(optional=True)
def update_blackbox_status(blackbox_id: str):
    """
    Update Black Box Lifecycle Status
    ---
    tags:
      - Black Box
    summary: Update incident lifecycle status (OPEN, UNDER_REVIEW, RESOLVED)
    security:
      - BearerAuth: []
    parameters:
      - name: blackbox_id
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
              - incident_status
            properties:
              incident_status:
                type: string
                enum: [OPEN, UNDER_REVIEW, RESOLVED]
    responses:
      200:
        description: Incident status updated
      403:
        description: Forbidden
      404:
        description: Black Box not found
      422:
        description: Validation error
    """
    current_user = get_current_user(optional=True)
    payload = request.get_json() or {}
    validated_data = status_schema.load(payload)

    updated = blackbox_service.update_blackbox_status(
        blackbox_id=blackbox_id,
        new_status=validated_data["incident_status"],
        current_user=current_user
    )

    return success_response(
        data=bb_res_schema.dump(updated),
        message="Failure Black Box incident status updated successfully.",
        status_code=200
    )
