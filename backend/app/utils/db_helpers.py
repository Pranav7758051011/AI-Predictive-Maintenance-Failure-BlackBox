from datetime import datetime
from typing import Any, Dict, List, Union, Optional
from bson import ObjectId
from app.utils.exceptions import ValidationError

def to_object_id(id_val: Union[str, ObjectId]) -> ObjectId:
    """
    Validates and safely converts a string representation to a BSON ObjectId.
    Raises ValidationError if format is invalid.
    """
    if isinstance(id_val, ObjectId):
        return id_val
    if not id_val or not isinstance(id_val, str) or not ObjectId.is_valid(id_val):
        raise ValidationError(f"Invalid ObjectId format: '{id_val}'")
    return ObjectId(id_val)

def serialize_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Recursively converts BSON ObjectIds and datetimes to JSON-serializable primitives.
    Maps '_id' to string representation and includes 'id' field for frontend convenience.
    """
    if doc is None:
        return None
    
    serialized = {}
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            serialized[key] = str(value)
            if key == "_id":
                serialized["id"] = str(value)
        elif isinstance(value, datetime):
            serialized[key] = value.isoformat()
        elif isinstance(value, dict):
            serialized[key] = serialize_doc(value)
        elif isinstance(value, list):
            serialized[key] = [
                serialize_doc(item) if isinstance(item, dict)
                else str(item) if isinstance(item, ObjectId)
                else item.isoformat() if isinstance(item, datetime)
                else item
                for item in value
            ]
        else:
            serialized[key] = value
            
    return serialized

def serialize_docs(docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Serializes a list of MongoDB documents."""
    return [serialize_doc(doc) for doc in docs if doc is not None]
