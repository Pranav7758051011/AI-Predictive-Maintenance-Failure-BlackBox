from marshmallow import Schema, fields, validate
from app.schemas.sensor_schema import SensorIngestRequestSchema

class PredictionRequestSchema(Schema):
    """Schema for requesting a direct prediction with raw telemetry."""
    machine_id = fields.String(
        required=True,
        error_messages={"required": "machine_id is required."}
    )
    telemetry = fields.Nested(
        SensorIngestRequestSchema,
        required=True,
        error_messages={"required": "Telemetry payload is required."}
    )
    threshold = fields.Float(
        load_default=None,
        validate=validate.Range(min=0.01, max=0.99, error="Threshold must be between 0.01 and 0.99.")
    )

class PredictionResponseSchema(Schema):
    """Schema for serialized prediction output."""
    id = fields.String(dump_only=True)
    machine_id = fields.String(dump_only=True)
    sensor_data_id = fields.String(dump_only=True, allow_none=True)
    failure_probability = fields.Float(dump_only=True)
    failure_prediction = fields.Boolean(dump_only=True)
    failure_type = fields.String(dump_only=True)
    health_score = fields.Float(dump_only=True)
    confidence = fields.Float(dump_only=True)
    model_version = fields.String(dump_only=True)
    blackbox_id = fields.String(dump_only=True, allow_none=True)
    blackbox_code = fields.String(dump_only=True, allow_none=True)
    timestamp = fields.Raw(dump_only=True)
    created_at = fields.Raw(dump_only=True)

class MachineHealthResponseSchema(Schema):
    """Schema for current machine health score and risk level."""
    machine_id = fields.String(dump_only=True)
    health_score = fields.Float(dump_only=True)
    failure_probability = fields.Float(dump_only=True)
    failure_prediction = fields.Boolean(dump_only=True)
    failure_type = fields.String(dump_only=True)
    health_status = fields.String(dump_only=True)
    confidence = fields.Float(dump_only=True)
    model_version = fields.String(dump_only=True)
    timestamp = fields.Raw(dump_only=True)

class PredictionListQuerySchema(Schema):
    """Schema for querying prediction history."""
    page = fields.Integer(load_default=1, validate=validate.Range(min=1))
    page_size = fields.Integer(load_default=50, validate=validate.Range(min=1, max=200))
    machine_id = fields.String(load_default=None)
    failure_only = fields.Boolean(load_default=None)
    start_time = fields.DateTime(load_default=None)
    end_time = fields.DateTime(load_default=None)
    sort_order = fields.String(
        load_default="desc",
        validate=validate.OneOf(["asc", "desc", "ASC", "DESC"])
    )
