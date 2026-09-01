import math
from datetime import datetime
from typing import Optional, Dict, Any, List, Union
from bson import ObjectId
from app.repositories.base_repository import BaseRepository
from app.utils.db_helpers import to_object_id, serialize_doc, serialize_docs

class PredictionRepository(BaseRepository):
    """Data access repository for 'predictions' collection."""
    def __init__(self):
        super().__init__("predictions")

    def create_prediction(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Inserts a single prediction record."""
        return self.insert_one(data)

    def get_latest_for_machine(self, machine_id: Union[str, ObjectId]) -> Optional[Dict[str, Any]]:
        """Retrieves the most recent prediction document for a machine."""
        obj_id = to_object_id(machine_id)
        doc = self.collection.find_one(
            {"machine_id": obj_id},
            sort=[("timestamp", -1)]
        )
        return serialize_doc(doc)

    def list_predictions(
        self,
        machine_id: Optional[Union[str, ObjectId]] = None,
        failure_only: Optional[bool] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 50,
        sort_order: str = "desc"
    ) -> Dict[str, Any]:
        """
        Retrieves paginated predictions with optional machine, failure, and time filtering.
        """
        query: Dict[str, Any] = {}
        if machine_id:
            query["machine_id"] = to_object_id(machine_id)
        if failure_only is not None:
            query["failure_prediction"] = bool(failure_only)

        if start_time or end_time:
            time_filter: Dict[str, Any] = {}
            if start_time:
                time_filter["$gte"] = start_time
            if end_time:
                time_filter["$lte"] = end_time
            query["timestamp"] = time_filter

        sort_dir = -1 if sort_order.lower() == "desc" else 1
        page = max(1, page)
        page_size = max(1, min(200, page_size))

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
