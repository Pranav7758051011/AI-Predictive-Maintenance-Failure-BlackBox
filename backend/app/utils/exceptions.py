from typing import Any, Optional, List, Dict

class AppException(Exception):
    """Base application exception for standardized error handling."""
    def __init__(
        self,
        message: str = "An internal error occurred",
        error_code: str = "INTERNAL_SERVER_ERROR",
        status_code: int = 500,
        errors: Optional[List[Dict[str, Any]]] = None
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.errors = errors or []

class ValidationError(AppException):
    """Raised when input validation fails."""
    def __init__(
        self,
        message: str = "Validation failed",
        errors: Optional[List[Dict[str, Any]]] = None
    ):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=422,
            errors=errors
        )

class NotFoundError(AppException):
    """Raised when a requested resource is not found."""
    def __init__(
        self,
        message: str = "Resource not found",
        error_code: str = "RESOURCE_NOT_FOUND"
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=404
        )

class UnauthorizedError(AppException):
    """Raised when authentication is missing or invalid."""
    def __init__(
        self,
        message: str = "Authentication required",
        error_code: str = "UNAUTHORIZED"
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=401
        )

class ForbiddenError(AppException):
    """Raised when user does not have permission for the action."""
    def __init__(
        self,
        message: str = "Access forbidden: insufficient permissions",
        error_code: str = "FORBIDDEN"
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=403
        )

class ConflictError(AppException):
    """Raised when a resource already exists or conflict occurs."""
    def __init__(
        self,
        message: str = "Resource conflict occurred",
        error_code: str = "RESOURCE_CONFLICT"
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=409
        )

class DatabaseConnectionError(AppException):
    """Raised when database operations fail or connectivity drops."""
    def __init__(
        self,
        message: str = "Database service unavailable",
        error_code: str = "DATABASE_UNAVAILABLE"
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=503
        )
