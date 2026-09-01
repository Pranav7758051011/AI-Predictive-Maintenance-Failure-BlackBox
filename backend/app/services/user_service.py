from typing import Dict, Any
from app.extensions import bcrypt
from app.repositories.user_repository import UserRepository
from app.utils.exceptions import NotFoundError, UnauthorizedError, ValidationError

class UserService:
    """Business logic service for user profile management and password operations."""
    def __init__(self, user_repo: UserRepository = None):
        self.user_repo = user_repo or UserRepository()

    def get_profile(self, user_id: str) -> Dict[str, Any]:
        """Retrieves safe profile for a user ID."""
        user = self.user_repo.find_by_id(user_id)
        if not user:
            raise NotFoundError("User not found.", error_code="USER_NOT_FOUND")
        user.pop("password_hash", None)
        return user

    def update_profile(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Updates user profile details.
        Guarantees that role, email, password, and security flags cannot be modified here.
        """
        user = self.user_repo.find_by_id(user_id)
        if not user:
            raise NotFoundError("User not found.", error_code="USER_NOT_FOUND")

        update_payload = {}
        if "full_name" in data and data["full_name"]:
            update_payload["full_name"] = data["full_name"].strip()

        if not update_payload:
            raise ValidationError("No valid fields provided for update.")

        updated_user = self.user_repo.update_by_id(user_id, update_payload)
        if updated_user:
            updated_user.pop("password_hash", None)
        return updated_user

    def change_password(self, user_id: str, current_password: str, new_password: str) -> bool:
        """Verifies current password and securely hashes and stores the new password."""
        user = self.user_repo.find_by_id(user_id)
        if not user:
            raise NotFoundError("User not found.", error_code="USER_NOT_FOUND")

        if not bcrypt.check_password_hash(user["password_hash"], current_password):
            raise UnauthorizedError(
                "Current password entered is incorrect.",
                error_code="INVALID_CURRENT_PASSWORD"
            )

        if current_password == new_password:
            raise ValidationError("New password must be different from current password.")

        new_password_hash = bcrypt.generate_password_hash(new_password).decode("utf-8")
        self.user_repo.update_by_id(user_id, {"password_hash": new_password_hash})
        return True
