from typing import Any, Optional, Dict, Tuple
from flask import jsonify, Response

def success_response(
    data: Any = None,
    message: str = "Request completed successfully",
    status_code: int = 200
) -> Tuple[Response, int]:
    """
    Standardized success response envelope.
    {
        "success": True,
        "message": "...",
        "data": { ... }
    }
    """
    payload: Dict[str, Any] = {
        "success": True,
        "message": message
    }
    if data is not None:
        payload["data"] = data
    else:
        payload["data"] = None

    return jsonify(payload), status_code

def error_response(
    message: str = "An error occurred",
    error_code: str = "INTERNAL_SERVER_ERROR",
    status_code: int = 500,
    errors: Optional[Any] = None
) -> Tuple[Response, int]:
    """
    Standardized error response envelope.
    {
        "success": False,
        "message": "...",
        "error_code": "...",
        "errors": [ ... ]
    }
    """
    payload: Dict[str, Any] = {
        "success": False,
        "message": message,
        "error_code": error_code
    }
    if errors is not None:
        payload["errors"] = errors

    return jsonify(payload), status_code
