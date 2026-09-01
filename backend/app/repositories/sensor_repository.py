import math
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Union
from bson import ObjectId
from app.repositories.base_repository import BaseRepository
from app.utils.db_helpers import to_object_id, serialize_doc, serialize_docs

class SensorRepository(BaseRepository):
    """Data access repository for 'sensor_data' telemetry collection."""
    def __init__(self):
        super().__init__("sensor_data")

    def create_telemetry(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Inserts a single sensor telemetry record."""
        return self.insert_one(data)

    def create_telemetry_batch(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Inserts a batch of sensor telemetry readings efficiently."""
        return self.insert_many(items)

    def get_latest(self, machine_id: Union[str, ObjectId]) -> Optional[Dict[str, Any]]:
        """Retrieves the most recent telemetry record for a machine."""
        obj_id = to_object_id(machine_id)
        doc = self.collection.find_one(
            {"machine_id": obj_id},
            sort=[("timestamp", -1)]
        )
        return serialize_doc(doc)

    def get_history(
        self,
        machine_id: Union[str, ObjectId],
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 50,
        sort_order: str = "desc"
    ) -> Dict[str, Any]:
        """
        Retrieves paginated historical telemetry for a machine with optional time range filtering.
        """
        obj_id = to_object_id(machine_id)
        query: Dict[str, Any] = {"machine_id": obj_id}

        if start_time or end_time:
            time_filter: Dict[str, Any] = {}
            if start_time:
                time_filter["$gte"] = start_time
            if end_time:
                time_filter["$lte"] = end_time
            query["timestamp"] = time_filter

        sort_dir = -1 if sort_order.lower() == "desc" else 1
        page = max(1, page)
        page_size = max(1, min(200, page_size)) # cap at 200 per page

        total = self.collection.count_documents(query)
        total_pages = math.ceil(total / page_size) if total > 0 else 1
        skip = (page - 1) * page_size

        cursor = self.collection.find(query).sort("timestamp", sort_dir).skip(skip).limit(page_size)
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

    def get_recent_samples(
        self, 
        machine_id: Union[str, ObjectId], 
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Retrieves the N most recent telemetry records for live monitoring."""
        obj_id = to_object_id(machine_id)
        cursor = self.collection.find(
            {"machine_id": obj_id}
        ).sort("timestamp", -1).limit(limit)
        
        # Return in chronological order (oldest to newest) for charting
        items = list(cursor)
        items.reverse()
        return serialize_docs(items)

    def count_for_machine(self, machine_id: Union[str, ObjectId]) -> int:
        """Counts total telemetry records for a machine."""
        obj_id = to_object_id(machine_id)
        return self.collection.count_documents({"machine_id": obj_id})
