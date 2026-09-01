import math
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Union
from bson import ObjectId
from app.repositories.base_repository import BaseRepository
from app.utils.db_helpers import to_object_id, serialize_doc, serialize_docs

class AuditRepository(BaseRepository):
    """Append-only data access repository for 'audit_logs' collection."""
    def __init__(self):
        super().__init__("audit_logs")

    def create_log(
        self,
        entity_type: str,
        entity_id: Union[str, ObjectId],
        action: str,
        actor_user_id: Optional[Union[str, ObjectId]] = None,
        actor_role: str = "SYSTEM",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Creates an immutable audit log entry."""
        log_entry = {
            "entity_type": entity_type,
            "entity_id": to_object_id(entity_id),
            "action": action,
            "actor_user_id": to_object_id(actor_user_id) if actor_user_id else None,
            "actor_role": actor_role,
            "metadata": metadata or {},
            "timestamp": datetime.now(timezone.utc)
        }
        return self.insert_one(log_entry)

    def list_logs_for_entity(
        self,
        entity_id: Union[str, ObjectId],
        page: int = 1,
        page_size: int = 50
    ) -> Dict[str, Any]:
        """Retrieves paginated audit logs for a specific entity."""
        obj_id = to_object_id(entity_id)
        query = {"entity_id": obj_id}
        
        page = max(1, page)
        page_size = max(1, min(200, page_size))
        total = self.collection.count_documents(query)
        total_pages = math.ceil(total / page_size) if total > 0 else 1
        skip = (page - 1) * page_size

        cursor = self.collection.find(query).sort("timestamp", -1).skip(skip).limit(page_size)
        items = serialize_docs(list(cursor))

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        }
