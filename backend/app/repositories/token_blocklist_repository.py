from datetime import datetime, timezone
from typing import Optional, Dict, Any
from app.repositories.base_repository import BaseRepository

class TokenBlocklistRepository(BaseRepository):
    """Data access repository for revoked JWT tokens."""
    def __init__(self):
        super().__init__("token_blocklist")

    def revoke_token(self, jti: str, token_type: str, user_identity: str, expires_at: Optional[datetime] = None) -> Dict[str, Any]:
        """Adds a token JTI to the blocklist."""
        doc = {
            "jti": jti,
            "token_type": token_type,
            "user_identity": str(user_identity),
            "revoked_at": datetime.now(timezone.utc),
            "expires_at": expires_at
        }
        return self.insert_one(doc)

    def is_token_revoked(self, jti: str) -> bool:
        """Checks if a token JTI exists in the blocklist."""
        if not jti:
            return False
        return self.count({"jti": jti}) > 0
