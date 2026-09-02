import re
from marshmallow import Schema, fields, validate, validates, ValidationError
from app.utils.constants import UserRole

def validate_password_complexity(password: str):
    """Validates that password has at least 8 characters, 1 digit or symbol, and 1 letter."""
    if len(password) < 8:
        raise ValidationError("Password must be at least 8 characters long.")
    if not re.search(r"[A-Za-z]", password):
        raise ValidationError("Password must contain at least one letter.")
    if not re.search(r"[\d\W_]", password):
        raise ValidationError("Password must contain at least one number or special character.")

class RegisterRequestSchema(Schema):
    """Schema for user registration."""
    email = fields.Email(
        required=True,
        error_messages={"required": "Email address is required."}
    )
    password = fields.String(
        required=True,
        validate=validate_password_complexity,
        error_messages={"required": "Password is required."}
    )
    full_name = fields.String(
        required=True,
        validate=validate.Length(min=2, max=100),
        error_messages={"required": "Full name is required."}
    )
    role = fields.String(
        load_default=UserRole.VIEWER,
        validate=validate.OneOf(UserRole.ALL, error=f"Role must be one of: {UserRole.ALL}")
    )

class LoginRequestSchema(Schema):
    """Schema for user login."""
    email = fields.Email(
        required=True,
        error_messages={"required": "Email address is required."}
    )
    password = fields.String(
        required=True,
        error_messages={"required": "Password is required."}
    )
    role = fields.String(
        required=False,
        validate=validate.OneOf(UserRole.ALL, error=f"Role must be one of: {UserRole.ALL}")
    )

class UserResponseSchema(Schema):
    """Safe public representation of user document (never includes password_hash)."""
    id = fields.String(dump_only=True)
    email = fields.Email(dump_only=True)
    full_name = fields.String(dump_only=True)
    role = fields.String(dump_only=True)
    is_active = fields.Boolean(dump_only=True)
    created_at = fields.Raw(dump_only=True)
    updated_at = fields.Raw(dump_only=True)

class TokenResponseSchema(Schema):
    """Schema for token authentication response."""
    access_token = fields.String(required=True)
    refresh_token = fields.String(dump_default=None)
    token_type = fields.String(dump_default="Bearer")
    expires_in = fields.Integer(dump_default=3600)
    user = fields.Nested(UserResponseSchema)
