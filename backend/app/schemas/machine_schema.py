from marshmallow import Schema, fields, validate, post_load
from app.utils.constants import MachineStatus, ProductType
from app.schemas.auth_schema import UserResponseSchema

class MachineSpecificationsSchema(Schema):
    """Schema for technical machine specifications."""
    rated_power_kw = fields.Float(
        validate=validate.Range(min=0.1, max=1000.0),
        load_default=15.0
    )
    max_torque_nm = fields.Float(
        validate=validate.Range(min=1.0, max=500.0),
        load_default=80.0
    )
    max_rpm = fields.Integer(
        validate=validate.Range(min=100, max=50000),
        load_default=3000
    )

class MachineCreateRequestSchema(Schema):
    """Schema for creating a new industrial machine."""
    serial_number = fields.String(
        required=True,
        validate=validate.Length(min=3, max=50),
        error_messages={"required": "Serial number is required."}
    )
    name = fields.String(
        required=True,
        validate=validate.Length(min=2, max=100),
        error_messages={"required": "Machine name is required."}
    )
    product_type = fields.String(
        required=True,
        validate=validate.OneOf(ProductType.ALL, error=f"Product type must be one of {ProductType.ALL}"),
        error_messages={"required": "Product type (L, M, H) is required."}
    )
    location = fields.String(
        required=True,
        validate=validate.Length(min=2, max=100),
        error_messages={"required": "Machine location is required."}
    )
    status = fields.String(
        load_default=MachineStatus.HEALTHY,
        validate=validate.OneOf(MachineStatus.ALL, error=f"Status must be one of {MachineStatus.ALL}")
    )
    assigned_engineer_id = fields.String(
        allow_none=True,
        load_default=None
    )
    seed_baseline = fields.Boolean(
        load_default=False
    )
    specifications = fields.Nested(
        MachineSpecificationsSchema,
        load_default=lambda: {
            "rated_power_kw": 15.0,
            "max_torque_nm": 80.0,
            "max_rpm": 3000
        }
    )

class MachineUpdateRequestSchema(Schema):
    """Schema for updating an existing machine."""
    name = fields.String(validate=validate.Length(min=2, max=100))
    product_type = fields.String(validate=validate.OneOf(ProductType.ALL))
    location = fields.String(validate=validate.Length(min=2, max=100))
    status = fields.String(validate=validate.OneOf(MachineStatus.ALL))
    assigned_engineer_id = fields.String(allow_none=True)
    specifications = fields.Nested(MachineSpecificationsSchema)

class MachineResponseSchema(Schema):
    """Schema for serialized machine data."""
    id = fields.String(dump_only=True)
    serial_number = fields.String(dump_only=True)
    name = fields.String(dump_only=True)
    product_type = fields.String(dump_only=True)
    location = fields.String(dump_only=True)
    status = fields.String(dump_only=True)
    current_health_score = fields.Float(dump_only=True)
    current_rul_hours = fields.Float(dump_only=True)
    assigned_engineer_id = fields.String(dump_only=True, allow_none=True)
    assigned_engineer = fields.Nested(UserResponseSchema, dump_only=True, allow_none=True)
    specifications = fields.Dict(dump_only=True)
    created_at = fields.Raw(dump_only=True)
    updated_at = fields.Raw(dump_only=True)

class MachineListQuerySchema(Schema):
    """Schema for parsing machine query parameters."""
    page = fields.Integer(load_default=1, validate=validate.Range(min=1))
    page_size = fields.Integer(load_default=20, validate=validate.Range(min=1, max=100))
    status = fields.String(load_default=None)
    product_type = fields.String(load_default=None)
    assigned_engineer_id = fields.String(load_default=None)
    search = fields.String(load_default=None)
