from marshmallow import Schema, fields, validate, EXCLUDE
from app.schemas.auth_schema import validate_password_complexity

class UpdateProfileRequestSchema(Schema):
    """Schema for updating safe user profile fields."""
    class Meta:
        unknown = EXCLUDE

    full_name = fields.String(
        required=True,
        validate=validate.Length(min=2, max=100),
        error_messages={"required": "Full name is required."}
    )

class ChangePasswordRequestSchema(Schema):
    """Schema for changing user password."""
    current_password = fields.String(
        required=True,
        error_messages={"required": "Current password is required."}
    )
    new_password = fields.String(
        required=True,
        validate=validate_password_complexity,
        error_messages={"required": "New password is required."}
    )
