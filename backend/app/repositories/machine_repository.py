from typing import Optional, Dict, Any, List, Union
from bson import ObjectId
from app.repositories.base_repository import BaseRepository
from app.utils.db_helpers import to_object_id

class MachineRepository(BaseRepository):
    """Data access repository for 'machines' collection."""
    def __init__(self):
        super().__init__("machines")

    def find_by_serial_number(self, serial_number: str) -> Optional[Dict[str, Any]]:
        """Finds a machine by unique serial number."""
        if not serial_number:
            return None
        return self.find_one({"serial_number": serial_number.strip().upper()})

    def is_serial_number_registered(self, serial_number: str, exclude_id: Optional[Union[str, ObjectId]] = None) -> bool:
        """Checks if a serial number exists, optionally excluding a specific machine ID."""
        if not serial_number:
            return False
        query: Dict[str, Any] = {"serial_number": serial_number.strip().upper()}
        if exclude_id:
            query["_id"] = {"$ne": to_object_id(exclude_id)}
        return self.count(query) > 0

    def find_by_assigned_engineer(self, engineer_id: Union[str, ObjectId]) -> List[Dict[str, Any]]:
        """Finds all machines assigned to a specific engineer."""
        obj_id = to_object_id(engineer_id)
        return self.find({"assigned_engineer_id": obj_id})
