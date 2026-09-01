import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union
from bson import ObjectId
from pymongo.collection import Collection
from pymongo.database import Database
from app.database import get_db
from app.utils.db_helpers import to_object_id, serialize_doc, serialize_docs

class BaseRepository:
    """
    Generic PyMongo Base Repository providing common CRUD operations,
    timestamp management, ObjectId conversion, and pagination.
    """
    def __init__(self, collection_name: str):
        self.collection_name = collection_name

    @property
    def collection(self) -> Collection:
        """Returns the PyMongo collection for this repository."""
        return get_db()[self.collection_name]

    def insert_one(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Inserts a document into the collection. Automatically populates
        'created_at' and 'updated_at' if not provided.
        Returns the inserted document serialized into JSON-friendly types.
        """
        now = datetime.now(timezone.utc)
        doc = dict(data)
        if "created_at" not in doc:
            doc["created_at"] = now
        if "updated_at" not in doc:
            doc["updated_at"] = now

        result = self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize_doc(doc)

    def insert_many(self, docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Inserts multiple documents with automatic timestamps."""
        if not docs:
            return []
            
        now = datetime.now(timezone.utc)
        prepared_docs = []
        for d in docs:
            doc = dict(d)
            if "created_at" not in doc:
                doc["created_at"] = now
            if "updated_at" not in doc:
                doc["updated_at"] = now
            prepared_docs.append(doc)
            
        result = self.collection.insert_many(prepared_docs)
        for i, inserted_id in enumerate(result.inserted_ids):
            prepared_docs[i]["_id"] = inserted_id
            
        return serialize_docs(prepared_docs)

    def find_by_id(
        self, 
        id_val: Union[str, ObjectId], 
        projection: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """Finds a single document by its ObjectId string or instance."""
        obj_id = to_object_id(id_val)
        doc = self.collection.find_one({"_id": obj_id}, projection)
        return serialize_doc(doc)

    def find_one(
        self, 
        filter_query: Optional[Dict[str, Any]] = None, 
        projection: Optional[Dict[str, Any]] = None,
        sort: Optional[List[tuple]] = None
    ) -> Optional[Dict[str, Any]]:
        """Finds the first document matching a filter query."""
        query = filter_query or {}
        if sort:
            doc = self.collection.find_one(query, projection, sort=sort)
        else:
            doc = self.collection.find_one(query, projection)
        return serialize_doc(doc)

    def find(
        self,
        filter_query: Optional[Dict[str, Any]] = None,
        projection: Optional[Dict[str, Any]] = None,
        sort: Optional[List[tuple]] = None,
        skip: int = 0,
        limit: int = 0
    ) -> List[Dict[str, Any]]:
        """Queries documents with optional filtering, sorting, skipping, and limiting."""
        query = filter_query or {}
        cursor = self.collection.find(query, projection)
        
        if sort:
            cursor = cursor.sort(sort)
        if skip > 0:
            cursor = cursor.skip(skip)
        if limit > 0:
            cursor = cursor.limit(limit)
            
        return serialize_docs(list(cursor))

    def find_paginated(
        self,
        filter_query: Optional[Dict[str, Any]] = None,
        page: int = 1,
        page_size: int = 20,
        sort: Optional[List[tuple]] = None,
        projection: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Executes a paginated query returning items and pagination metadata.
        """
        page = max(1, page)
        page_size = max(1, min(100, page_size)) # cap between 1 and 100
        query = filter_query or {}
        
        total = self.collection.count_documents(query)
        total_pages = math.ceil(total / page_size) if total > 0 else 1
        skip = (page - 1) * page_size
        
        items = self.find(
            filter_query=query,
            projection=projection,
            sort=sort,
            skip=skip,
            limit=page_size
        )
        
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }

    def update_by_id(
        self, 
        id_val: Union[str, ObjectId], 
        update_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Updates a document by ObjectId. Automatically updates 'updated_at' timestamp.
        Returns the updated serialized document or None if not found.
        """
        obj_id = to_object_id(id_val)
        data = dict(update_data)
        data["updated_at"] = datetime.now(timezone.utc)
        
        # Strip immutable fields if accidentally passed
        data.pop("_id", None)
        data.pop("id", None)
        
        self.collection.update_one(
            {"_id": obj_id},
            {"$set": data}
        )
        return self.find_by_id(obj_id)

    def update_one(
        self, 
        filter_query: Dict[str, Any], 
        update_data: Dict[str, Any]
    ) -> int:
        """Updates the first document matching a filter query. Returns modified count."""
        data = dict(update_data)
        data["updated_at"] = datetime.now(timezone.utc)
        data.pop("_id", None)
        
        result = self.collection.update_one(
            filter_query,
            {"$set": data}
        )
        return result.modified_count

    def delete_by_id(self, id_val: Union[str, ObjectId]) -> bool:
        """Deletes a document by ObjectId. Returns True if deleted, False if not found."""
        obj_id = to_object_id(id_val)
        result = self.collection.delete_one({"_id": obj_id})
        return result.deleted_count > 0

    def delete_one(self, filter_query: Dict[str, Any]) -> bool:
        """Deletes one document matching filter query."""
        result = self.collection.delete_one(filter_query)
        return result.deleted_count > 0

    def count(self, filter_query: Optional[Dict[str, Any]] = None) -> int:
        """Counts documents matching filter query."""
        query = filter_query or {}
        return self.collection.count_documents(query)

    def aggregate(self, pipeline: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Executes an aggregation pipeline and returns serialized results."""
        cursor = self.collection.aggregate(pipeline)
        return serialize_docs(list(cursor))
