from marshmallow import Schema, fields, validate, pre_load, ValidationError
from app.utils.constants import ProductType

class SensorIngestRequestSchema(Schema):
    """Schema for validating ingested machine sensor telemetry."""
    air_temp = fields.Float(
        required=True,
        validate=validate.Range(min=200.0, max=400.0, error="Air temperature must be between 200K and 400K."),
        error_messages={"required": "Air temperature (air_temp in Kelvin) is required."}
    )
    process_temp = fields.Float(
        required=True,
        validate=validate.Range(min=200.0, max=450.0, error="Process temperature must be between 200K and 450K."),
        error_messages={"required": "Process temperature (process_temp in Kelvin) is required."}
    )
    rotational_speed = fields.Float(
        required=True,
        validate=validate.Range(min=50.0, max=20000.0, error="Rotational speed must be between 50 and 20000 RPM."),
        error_messages={"required": "Rotational speed (rotational_speed in RPM) is required."}
    )
    torque = fields.Float(
        required=True,
        validate=validate.Range(min=0.0, max=1000.0, error="Torque must be between 0 and 1000 Nm."),
        error_messages={"required": "Torque (torque in Nm) is required."}
    )
    tool_wear = fields.Float(
        required=True,
        validate=validate.Range(min=0.0, max=2000.0, error="Tool wear must be between 0 and 2000 minutes."),
        error_messages={"required": "Tool wear (tool_wear in minutes) is required."}
    )
    product_type = fields.String(
        validate=validate.OneOf(ProductType.ALL, error=f"Product type must be one of: {ProductType.ALL}"),
        load_default=None
    )
    timestamp = fields.DateTime(
        load_default=None,
        error_messages={"invalid": "Invalid ISO timestamp format."}
    )

class SensorBatchIngestRequestSchema(Schema):
    """Schema for batch ingestion of telemetry records."""
    readings = fields.List(
        fields.Nested(SensorIngestRequestSchema),
        required=True,
        validate=validate.Length(min=1, max=500, error="Batch must contain between 1 and 500 telemetry records."),
        error_messages={"required": "The 'readings' list is required for batch ingestion."}
    )

class SensorResponseSchema(Schema):
    """Schema for serialized sensor telemetry data."""
    id = fields.String(dump_only=True)
    machine_id = fields.String(dump_only=True)
    air_temp = fields.Float(dump_only=True)
    process_temp = fields.Float(dump_only=True)
    rotational_speed = fields.Float(dump_only=True)
    torque = fields.Float(dump_only=True)
    tool_wear = fields.Float(dump_only=True)
    product_type = fields.String(dump_only=True)
    temperature_difference = fields.Float(dump_only=True)
    power = fields.Float(dump_only=True)
    timestamp = fields.Raw(dump_only=True)
    created_at = fields.Raw(dump_only=True)

class SensorHistoryQuerySchema(Schema):
    """Schema for filtering and paginating historical telemetry."""
    page = fields.Integer(load_default=1, validate=validate.Range(min=1))
    page_size = fields.Integer(load_default=50, validate=validate.Range(min=1, max=200))
    start_time = fields.DateTime(load_default=None)
    end_time = fields.DateTime(load_default=None)
    sort_order = fields.String(
        load_default="desc",
        validate=validate.OneOf(["asc", "desc", "ASC", "DESC"])
    )

class MachineMonitoringResponseSchema(Schema):
    """Schema for live telemetry monitoring cockpit response."""
    machine = fields.Dict(dump_only=True)
    latest_telemetry = fields.Nested(SensorResponseSchema, dump_only=True, allow_none=True)
    recent_telemetry = fields.List(fields.Nested(SensorResponseSchema), dump_only=True)
    telemetry_status = fields.String(dump_only=True)
    total_samples = fields.Integer(dump_only=True)
    last_updated = fields.Raw(dump_only=True, allow_none=True)
