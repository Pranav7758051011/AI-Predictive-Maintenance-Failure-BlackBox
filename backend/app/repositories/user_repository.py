from typing import Optional, Dict, Any, List
from app.repositories.base_repository import BaseRepository
from app.utils.constants import UserRole
from app.utils.db_helpers import serialize_doc

class UserRepository(BaseRepository):
    """Data access repository for 'users' collection."""
    def __init__(self):
        super().__init__("users")

    def find_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Finds user by email address (case-insensitive)."""
        if not email:
            return None
        return self.find_one({"email": email.strip().lower()})

    def is_email_registered(self, email: str) -> bool:
        """Checks if an email is already registered."""
        if not email:
            return False
        return self.count({"email": email.strip().lower()}) > 0

    def find_engineers(self) -> List[Dict[str, Any]]:
        """Returns list of active engineers for assignment."""
        return self.find({"role": UserRole.ENGINEER, "is_active": True})
