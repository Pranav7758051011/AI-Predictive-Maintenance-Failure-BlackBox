import math
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Union
from bson import ObjectId
from app.repositories.base_repository import BaseRepository
from app.utils.db_helpers import to_object_id, serialize_doc, serialize_docs

class BlackBoxRepository(BaseRepository):
    """Data access repository for 'failure_blackboxes' collection."""
    def __init__(self):
        super().__init__("failure_blackboxes")

    def create_blackbox(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Persists a new immutable failure blackbox incident snapshot."""
        return self.insert_one(data)

    def find_by_code(self, blackbox_code: str) -> Optional[Dict[str, Any]]:
        """Retrieves a Black Box by its human-readable code (e.g. 'BB-2026-000001')."""
        doc = self.collection.find_one({"blackbox_code": blackbox_code.strip().upper()})
        return serialize_doc(doc)

    def find_by_trigger_prediction_id(self, trigger_prediction_id: Union[str, ObjectId]) -> Optional[Dict[str, Any]]:
        """Checks for existing Black Box tied to a specific prediction (idempotency check)."""
        pred_obj_id = to_object_id(trigger_prediction_id)
        doc = self.collection.find_one({"trigger_prediction_id": pred_obj_id})
        return serialize_doc(doc)

    def generate_next_code(self) -> str:
        """Generates a human-readable unique sequential Black Box identifier (e.g. 'BB-2026-000001')."""
        current_year = datetime.now(timezone.utc).year
        prefix = f"BB-{current_year}-"
        count = self.collection.count_documents({"blackbox_code": {"$regex": f"^{prefix}"}})
        seq = count + 1
        return f"{prefix}{seq:06d}"

    def update_status(self, blackbox_id: Union[str, ObjectId], new_status: str) -> Optional[Dict[str, Any]]:
        """
        Updates only the incident_status of a Black Box.
        All historical evidence, telemetry, machine snapshot, and failure predictions remain strictly immutable.
        """
        return self.update_by_id(blackbox_id, {"incident_status": new_status})

    def list_blackboxes(
        self,
        machine_id: Optional[Union[str, ObjectId]] = None,
        failure_type: Optional[str] = None,
        incident_status: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 50,
        sort_order: str = "desc"
    ) -> Dict[str, Any]:
        """Retrieves paginated Black Box incidents with filtering."""
        query: Dict[str, Any] = {}
        if machine_id:
            query["machine_id"] = to_object_id(machine_id)
        if failure_type:
            query["failure_summary.failure_type"] = failure_type.strip().upper()
        if incident_status:
            query["incident_status"] = incident_status.strip().upper()

        if start_time or end_time:
            time_filter: Dict[str, Any] = {}
            if start_time:
                time_filter["$gte"] = start_time
            if end_time:
                time_filter["$lte"] = end_time
            query["failure_timestamp"] = time_filter

        sort_dir = -1 if sort_order.lower() == "desc" else 1
        page = max(1, page)
        page_size = max(1, min(200, page_size))

        total = self.collection.count_documents(query)
        total_pages = math.ceil(total / page_size) if total > 0 else 1
        skip = (page - 1) * page_size

        cursor = self.collection.find(query).sort("failure_timestamp", sort_dir).skip(skip).limit(page_size)
        items = serialize_docs(list(cursor))

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
