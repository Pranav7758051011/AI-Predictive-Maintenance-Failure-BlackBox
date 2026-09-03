import logging
from flask import Flask
from werkzeug.exceptions import HTTPException
from marshmallow.exceptions import ValidationError as MarshmallowValidationError
from pymongo.errors import PyMongoError
from app.utils.exceptions import AppException
from app.utils.response_helpers import error_response

logger = logging.getLogger("app.error_handler")

def register_error_handlers(app: Flask):
    """Registers centralized JSON error handlers on the Flask app."""

    @app.errorhandler(AppException)
    def handle_app_exception(e: AppException):
        """Handles custom application exceptions with specific error codes."""
        logger.warning(f"AppException: [{e.error_code}] {e.message} (status: {e.status_code})")
        return error_response(
            message=e.message,
            error_code=e.error_code,
            status_code=e.status_code,
            errors=e.errors if e.errors else None
        )

    @app.errorhandler(MarshmallowValidationError)
    def handle_marshmallow_validation_error(e: MarshmallowValidationError):
        """Handles Marshmallow schema validation errors."""
        logger.info(f"Schema ValidationError: {e.messages}")
        return error_response(
            message="Input data validation failed",
            error_code="VALIDATION_ERROR",
            status_code=422,
            errors=e.messages
        )

    @app.errorhandler(HTTPException)
    def handle_http_exception(e: HTTPException):
        """Handles standard Werkzeug HTTP exceptions (400, 404, 405, 429, etc.)."""
        error_code_map = {
            400: "BAD_REQUEST",
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            405: "METHOD_NOT_ALLOWED",
            408: "REQUEST_TIMEOUT",
            422: "UNPROCESSABLE_ENTITY",
            429: "TOO_MANY_REQUESTS",
            500: "INTERNAL_SERVER_ERROR",
            502: "BAD_GATEWAY",
            503: "SERVICE_UNAVAILABLE"
        }
        error_code = error_code_map.get(e.code, "HTTP_ERROR")
        return error_response(
            message=e.description or "HTTP error occurred",
            error_code=error_code,
            status_code=e.code or 500
        )

    @app.errorhandler(PyMongoError)
    def handle_pymongo_error(e: PyMongoError):
        """Catches database level errors."""
        logger.error(f"Database error caught: {e}", exc_info=True)
        return error_response(
            message=f"Database operation failed: {str(e)}",
            error_code="DATABASE_ERROR",
            status_code=500
        )

    @app.errorhandler(Exception)
    def handle_generic_exception(e: Exception):
        """Fallback handler for unhandled exceptions."""
        logger.error(f"Unhandled Exception: {e}", exc_info=True)
        return error_response(
            message="An unexpected internal server error occurred",
            error_code="INTERNAL_SERVER_ERROR",
            status_code=500
        )
