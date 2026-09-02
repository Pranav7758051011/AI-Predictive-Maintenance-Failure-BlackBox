from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.user_service import UserService
from app.schemas.auth_schema import UserResponseSchema
from app.schemas.user_schema import UpdateProfileRequestSchema, ChangePasswordRequestSchema
from app.utils.response_helpers import success_response

user_bp = Blueprint("users", __name__, url_prefix="/api/users")
user_service = UserService()

user_response_schema = UserResponseSchema()
update_profile_schema = UpdateProfileRequestSchema()
change_password_schema = ChangePasswordRequestSchema()

@user_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    """
    Get User Profile
    ---
    tags:
      - Users
    summary: Retrieve profile for authenticated user
    security:
      - BearerAuth: []
    responses:
      200:
        description: User profile
      401:
        description: Unauthorized
    """
    user_id = get_jwt_identity()
    profile = user_service.get_profile(user_id)
    return success_response(
        data=user_response_schema.dump(profile),
        message="User profile retrieved successfully.",
        status_code=200
    )

@user_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    """
    Update User Profile
    ---
    tags:
      - Users
    summary: Update editable profile fields (full name)
    security:
      - BearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - full_name
            properties:
              full_name:
                type: string
                example: Jane Doe
    responses:
      200:
        description: Profile updated successfully
      422:
        description: Validation error
    """
    user_id = get_jwt_identity()
    payload = request.get_json() or {}
    validated_data = update_profile_schema.load(payload)
    
    updated_profile = user_service.update_profile(user_id, validated_data)
    return success_response(
        data=user_response_schema.dump(updated_profile),
        message="Profile updated successfully.",
        status_code=200
    )

@user_bp.route("/change-password", methods=["PUT"])
@jwt_required()
def change_password():
    """
    Change Password
    ---
    tags:
      - Users
    summary: Securely update user account password
    security:
      - BearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - current_password
              - new_password
            properties:
              current_password:
                type: string
                example: OldSecret123!
              new_password:
                type: string
                example: NewSecret456!
    responses:
      200:
        description: Password changed successfully
      401:
        description: Incorrect current password
      422:
        description: Validation error
    """
    user_id = get_jwt_identity()
    payload = request.get_json() or {}
    validated_data = change_password_schema.load(payload)
    
    user_service.change_password(
        user_id=user_id,
        current_password=validated_data["current_password"],
        new_password=validated_data["new_password"]
    )
    
    return success_response(
        data=None,
        message="Password changed successfully.",
        status_code=200
    )

@user_bp.route("/profile", methods=["DELETE"])
@user_bp.route("/me", methods=["DELETE"])
@jwt_required()
def delete_profile():
    """
    Delete User Account
    ---
    tags:
      - Users
    summary: Permanently delete current authenticated account
    security:
      - BearerAuth: []
    responses:
      200:
        description: Account deleted successfully
      401:
        description: Unauthorized
      404:
        description: User not found
    """
    user_id = get_jwt_identity()
    user_service.delete_account(user_id)
    return success_response(
        data=None,
        message="Account permanently deleted successfully.",
        status_code=200
    )
