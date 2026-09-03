from functools import wraps
from typing import Union, List, Dict, Any, Optional
from flask_jwt_extended import (
    verify_jwt_in_request, 
    get_jwt, 
    get_jwt_identity
)
from app.extensions import jwt
from app.repositories.token_blocklist_repository import TokenBlocklistRepository
from app.repositories.user_repository import UserRepository
from app.utils.exceptions import ForbiddenError, UnauthorizedError

token_blocklist_repo = TokenBlocklistRepository()
user_repo = UserRepository()

def init_jwt_blocklist_loader():
    """Configures JWT token blocklist verification callback."""
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload: dict) -> bool:
        jti = jwt_payload.get("jti")
        return token_blocklist_repo.is_token_revoked(jti)

def role_required(allowed_roles: Union[str, List[str]]):
    """
    Decorator enforcing Role-Based Access Control (RBAC).
    Usage:
        @role_required("ADMIN")
        or
        @role_required(["ADMIN", "ENGINEER"])
    """
    if isinstance(allowed_roles, str):
        roles_list = [allowed_roles]
    else:
        roles_list = list(allowed_roles)

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # Verify JWT is present and valid in request
            verify_jwt_in_request()
            
            claims = get_jwt()
            user_role = claims.get("role")
            
            if not user_role:
                raise UnauthorizedError("User role claim missing in token")
                
            if user_role not in roles_list:
                raise ForbiddenError(
                    f"Access forbidden: requires one of {roles_list} (current role: '{user_role}')"
                )
                
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def get_current_user() -> Dict[str, Any]:
    """
    Fetches the full database record for the currently authenticated user.
    Raises UnauthorizedError if user not found or inactive.
    """
    verify_jwt_in_request()
    user_id = get_jwt_identity()
    user = user_repo.find_by_id(user_id)
    
    # Fallback to lookup by email if ID was re-generated
    if not user:
        claims = get_jwt()
        email = claims.get("email")
        if email:
            user = user_repo.find_by_email(email)
            
    if not user:
        raise UnauthorizedError("User account not found or was removed", error_code="USER_NOT_FOUND")
    if not user.get("is_active", True):
        raise UnauthorizedError("User account is inactive. Please contact administrator.", error_code="ACCOUNT_INACTIVE")
        
    return user
