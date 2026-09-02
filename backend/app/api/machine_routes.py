from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app.services.machine_service import MachineService
from app.schemas.machine_schema import (
    MachineCreateRequestSchema,
    MachineUpdateRequestSchema,
    MachineResponseSchema,
    MachineListQuerySchema
)
from app.middleware.auth_middleware import role_required, get_current_user
from app.utils.constants import UserRole
from app.utils.response_helpers import success_response

machine_bp = Blueprint("machines", __name__, url_prefix="/api/machines")
machine_service = MachineService()

create_machine_schema = MachineCreateRequestSchema()
update_machine_schema = MachineUpdateRequestSchema()
machine_response_schema = MachineResponseSchema()
machine_list_query_schema = MachineListQuerySchema()

@machine_bp.route("", methods=["GET"])
@jwt_required()
def list_machines():
    """
    List Industrial Machines
    ---
    tags:
      - Machines
    summary: Retrieve paginated list of machines with filtering and search
    security:
      - BearerAuth: []
    parameters:
      - name: page
        in: query
        schema:
          type: integer
          default: 1
      - name: page_size
        in: query
        schema:
          type: integer
          default: 20
      - name: status
        in: query
        schema:
          type: string
          enum: [ALL, HEALTHY, WARNING, CRITICAL, MAINTENANCE, OFFLINE]
      - name: product_type
        in: query
        schema:
          type: string
          enum: [ALL, L, M, H]
      - name: search
        in: query
        schema:
          type: string
    responses:
      200:
        description: Paginated machine list
      401:
        description: Unauthorized
    """
    current_user = get_current_user()
    query_params = machine_list_query_schema.load(request.args.to_dict())
    
    result = machine_service.list_machines(query_params, current_user)
    
    # Serialize items
    result["items"] = machine_response_schema.dump(result["items"], many=True)
    return success_response(
        data=result,
        message="Machines retrieved successfully.",
        status_code=200
    )

@machine_bp.route("/<id>", methods=["GET"])
@jwt_required()
def get_machine(id: str):
    """
    Get Machine by ID
    ---
    tags:
      - Machines
    summary: Retrieve complete machine specifications and live status
    security:
      - BearerAuth: []
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    responses:
      200:
        description: Machine details
      403:
        description: Forbidden (Engineer not assigned to this machine)
      404:
        description: Machine not found
    """
    current_user = get_current_user()
    machine = machine_service.get_machine(id, current_user)
    
    return success_response(
        data=machine_response_schema.dump(machine),
        message="Machine details retrieved successfully.",
        status_code=200
    )

@machine_bp.route("", methods=["POST"])
@jwt_required()
@role_required([UserRole.ADMIN, UserRole.ENGINEER])
def create_machine():
    """
    Create Machine (Admin and Engineer)
    ---
    tags:
      - Machines
    summary: Register a new industrial machine
    security:
      - BearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - serial_number
              - name
              - product_type
              - location
            properties:
              serial_number:
                type: string
                example: CNC-MILL-001
              name:
                type: string
                example: 5-Axis CNC Milling Station
              product_type:
                type: string
                enum: [L, M, H]
                example: M
              location:
                type: string
                example: Bay 3, Sector B
              status:
                type: string
                enum: [HEALTHY, WARNING, CRITICAL, MAINTENANCE, OFFLINE]
                example: HEALTHY
              assigned_engineer_id:
                type: string
                example: 60d5ec49f1b2c8b1f8e4e1a1
              specifications:
                type: object
                properties:
                  rated_power_kw:
                    type: number
                    example: 15.0
                  max_torque_nm:
                    type: number
                    example: 80.0
                  max_rpm:
                    type: integer
                    example: 3000
    responses:
      201:
        description: Machine created successfully
      403:
        description: Forbidden (Admin and Engineer only)
      409:
        description: Serial number already exists
      422:
        description: Validation error
    """
    payload = request.get_json() or {}
    validated_data = create_machine_schema.load(payload)
    created_machine = machine_service.create_machine(validated_data)
    
    return success_response(
        data=machine_response_schema.dump(created_machine),
        message="Machine created successfully.",
        status_code=201
    )

@machine_bp.route("/<id>", methods=["PUT"])
@jwt_required()
@role_required([UserRole.ADMIN, UserRole.ENGINEER])
def update_machine(id: str):
    """
    Update Machine (Admin and Engineer)
    ---
    tags:
      - Machines
    summary: Modify machine details, specifications, or assigned engineer
    security:
      - BearerAuth: []
    parameters:
      - name: id
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
            properties:
              name:
                type: string
              location:
                type: string
              status:
                type: string
                enum: [HEALTHY, WARNING, CRITICAL, MAINTENANCE, OFFLINE]
              assigned_engineer_id:
                type: string
              specifications:
                type: object
    responses:
      200:
        description: Machine updated successfully
      403:
        description: Forbidden (Admin and Engineer only)
      404:
        description: Machine not found
      422:
        description: Validation error
    """
    payload = request.get_json() or {}
    validated_data = update_machine_schema.load(payload)
    updated_machine = machine_service.update_machine(id, validated_data)
    
    return success_response(
        data=machine_response_schema.dump(updated_machine),
        message="Machine updated successfully.",
        status_code=200
    )

@machine_bp.route("/<id>", methods=["DELETE"])
@jwt_required()
@role_required([UserRole.ADMIN, UserRole.ENGINEER])
def delete_machine(id: str):
    """
    Delete Machine (Admin and Engineer)
    ---
    tags:
      - Machines
    summary: Remove machine from inventory and delete associated telemetry
    security:
      - BearerAuth: []
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    responses:
      200:
        description: Machine deleted successfully
      403:
        description: Forbidden (Admin and Engineer only)
      404:
        description: Machine not found
    """
    machine_service.delete_machine(id)
    return success_response(
        data=None,
        message="Machine and associated telemetry deleted successfully.",
        status_code=200
    )

@machine_bp.route("/<id>/assign", methods=["POST"])
@jwt_required()
@role_required([UserRole.ADMIN, UserRole.ENGINEER])
def assign_engineer(id: str):
    """
    Assign Engineer to Machine
    ---
    tags:
      - Machines
    summary: Assign a designated reliability engineer to a machine
    security:
      - BearerAuth: []
    parameters:
      - name: id
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
              - engineer_id
            properties:
              engineer_id:
                type: string
    responses:
      200:
        description: Engineer assigned successfully
      400:
        description: User is not an engineer
      403:
        description: Forbidden
      404:
        description: Machine or engineer not found
    """
    payload = request.get_json() or {}
    engineer_id = payload.get("engineer_id")
    if not engineer_id:
        from app.utils.response_helpers import error_response
        return error_response("Field 'engineer_id' is required.", status_code=422)
        
    updated_machine = machine_service.assign_engineer(id, engineer_id)
    return success_response(
        data=machine_response_schema.dump(updated_machine),
        message="Engineer assigned successfully.",
        status_code=200
    )
