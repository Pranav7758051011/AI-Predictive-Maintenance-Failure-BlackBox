from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.services.auth_service import AuthService
from app.schemas.auth_schema import (
    RegisterRequestSchema, 
    LoginRequestSchema, 
    UserResponseSchema, 
    TokenResponseSchema
)
from app.middleware.auth_middleware import get_current_user
from app.utils.response_helpers import success_response

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")
auth_service = AuthService()

register_schema = RegisterRequestSchema()
login_schema = LoginRequestSchema()
user_response_schema = UserResponseSchema()
token_response_schema = TokenResponseSchema()

@auth_bp.route("/register", methods=["POST"])
def register():
    """
    User Registration
    ---
    tags:
      - Authentication
    summary: Register a new user account
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - email
              - password
              - full_name
            properties:
              email:
                type: string
                example: engineer@plant.com
              password:
                type: string
                example: SecretPass123!
              full_name:
                type: string
                example: John Doe
              role:
                type: string
                enum: [ADMIN, ENGINEER, VIEWER]
                example: ENGINEER
    responses:
      201:
        description: User registered successfully
      409:
        description: Email already registered
      422:
        description: Validation error
    """
    payload = request.get_json() or {}
    validated_data = register_schema.load(payload)
    created_user = auth_service.register(validated_data)
    
    return success_response(
        data=user_response_schema.dump(created_user),
        message="User account registered successfully.",
        status_code=201
    )

@auth_bp.route("/login", methods=["POST"])
def login():
    """
    User Login
    ---
    tags:
      - Authentication
    summary: Authenticate user credentials and issue JWT tokens
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - email
              - password
            properties:
              email:
                type: string
                example: engineer@plant.com
              password:
                type: string
                example: SecretPass123!
    responses:
      200:
        description: Successfully authenticated
      401:
        description: Invalid credentials
      422:
        description: Validation error
    """
    payload = request.get_json() or {}
    validated_data = login_schema.load(payload)
    token_data = auth_service.login(validated_data)
    
    return success_response(
        data=token_response_schema.dump(token_data),
        message="Login successful.",
        status_code=200
    )

@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """
    Token Refresh
    ---
    tags:
      - Authentication
    summary: Generate a new JWT access token using a valid refresh token
    security:
      - BearerAuth: []
    responses:
      200:
        description: Access token refreshed successfully
      401:
        description: Invalid or expired refresh token
    """
    user_identity = get_jwt_identity()
    claims = get_jwt()
    refresh_result = auth_service.refresh(user_identity, claims)
    
    return success_response(
        data=refresh_result,
        message="Token refreshed successfully.",
        status_code=200
    )

@auth_bp.route("/logout", methods=["POST"])
@jwt_required(verify_type=False)
def logout():
    """
    User Logout
    ---
    tags:
      - Authentication
    summary: Revoke active JWT token and logout user
    security:
      - BearerAuth: []
    responses:
      200:
        description: Logged out successfully
      401:
        description: Missing or invalid token
    """
    jwt_payload = get_jwt()
    auth_service.logout(jwt_payload)
    
    return success_response(
        data=None,
        message="Successfully logged out and revoked token.",
        status_code=200
    )

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    """
    Get Current User Profile
    ---
    tags:
      - Authentication
    summary: Retrieve safe profile details of current authenticated user
    security:
      - BearerAuth: []
    responses:
      200:
        description: Current user profile
      401:
        description: Unauthorized
    """
    current_user = get_current_user()
    return success_response(
        data=user_response_schema.dump(current_user),
        message="Current user profile retrieved successfully.",
        status_code=200
    )
