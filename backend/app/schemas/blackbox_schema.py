from marshmallow import Schema, fields, validate

class BlackBoxGenerateRequestSchema(Schema):
    """Schema for manual Black Box incident capture on a prediction."""
    prediction_id = fields.String(
        required=True,
        error_messages={"required": "prediction_id is required."}
    )

class BlackBoxStatusUpdateRequestSchema(Schema):
    """Schema for updating Black Box incident lifecycle status."""
    incident_status = fields.String(
        required=True,
        validate=validate.OneOf(["OPEN", "UNDER_REVIEW", "RESOLVED"], error="Status must be one of: OPEN, UNDER_REVIEW, RESOLVED"),
        error_messages={"required": "incident_status is required."}
    )

class BlackBoxResponseSchema(Schema):
    """Schema for full Black Box incident record."""
    id = fields.String(dump_only=True)
    blackbox_code = fields.String(dump_only=True)
    machine_id = fields.String(dump_only=True)
    trigger_prediction_id = fields.String(dump_only=True)
    trigger_source = fields.String(dump_only=True)
    failure_timestamp = fields.Raw(dump_only=True)
    failure_summary = fields.Dict(dump_only=True)
    machine_snapshot = fields.Dict(dump_only=True)
    telemetry_window = fields.Dict(dump_only=True)
    telemetry_history = fields.List(fields.Dict(), dump_only=True)
    prediction_history = fields.List(fields.Dict(), dump_only=True)
    event_timeline = fields.List(fields.Dict(), dump_only=True)
    incident_status = fields.String(dump_only=True)
    created_at = fields.Raw(dump_only=True)
    created_by = fields.String(dump_only=True, allow_none=True)

class ReplayFrameSchema(Schema):
    """Schema for a single time-series replay frame."""
    timestamp = fields.Raw(dump_only=True)
    telemetry = fields.Dict(dump_only=True, allow_none=True)
    prediction = fields.Dict(dump_only=True, allow_none=True)

class BlackBoxReplayResponseSchema(Schema):
    """Schema for chronological incident replay frames."""
    blackbox_code = fields.String(dump_only=True)
    machine_id = fields.String(dump_only=True)
    failure_timestamp = fields.Raw(dump_only=True)
    failure_type = fields.String(dump_only=True)
    total_frames = fields.Integer(dump_only=True)
    frames = fields.List(fields.Nested(ReplayFrameSchema), dump_only=True)

class BlackBoxListQuerySchema(Schema):
    """Schema for filtering Black Box incidents."""
    page = fields.Integer(load_default=1, validate=validate.Range(min=1))
    page_size = fields.Integer(load_default=50, validate=validate.Range(min=1, max=200))
    machine_id = fields.String(load_default=None)
    failure_type = fields.String(load_default=None)
    incident_status = fields.String(load_default=None)
    start_time = fields.DateTime(load_default=None)
    end_time = fields.DateTime(load_default=None)
    sort_order = fields.String(
        load_default="desc",
        validate=validate.OneOf(["asc", "desc", "ASC", "DESC"])
    )

class AuditLogResponseSchema(Schema):
    """Schema for audit trail log entries."""
    id = fields.String(dump_only=True)
    entity_type = fields.String(dump_only=True)
    entity_id = fields.String(dump_only=True)
    action = fields.String(dump_only=True)
    actor_user_id = fields.String(dump_only=True, allow_none=True)
    actor_role = fields.String(dump_only=True)
    metadata = fields.Dict(dump_only=True)
    timestamp = fields.Raw(dump_only=True)
