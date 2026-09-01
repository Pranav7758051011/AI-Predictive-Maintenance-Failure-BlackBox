import pytest
from app.repositories.base_repository import BaseRepository
from app.utils.exceptions import ValidationError

class ItemRepository(BaseRepository):
    def __init__(self):
        super().__init__("test_items")

@pytest.fixture
def item_repo(app):
    return ItemRepository()

def test_insert_one_and_find_by_id(item_repo):
    """Test inserting a document and fetching it by ID."""
    data = {"name": "Test Item 1", "value": 42}
    inserted = item_repo.insert_one(data)
    
    assert "id" in inserted
    assert inserted["name"] == "Test Item 1"
    assert inserted["value"] == 42
    assert "created_at" in inserted
    assert "updated_at" in inserted

    # Find by ID
    found = item_repo.find_by_id(inserted["id"])
    assert found is not None
    assert found["id"] == inserted["id"]
    assert found["name"] == "Test Item 1"

def test_find_by_invalid_id_raises_validation_error(item_repo):
    """Test that querying with invalid ObjectId format raises ValidationError."""
    with pytest.raises(ValidationError):
        item_repo.find_by_id("invalid-hex-string")

def test_find_one_and_find_all(item_repo):
    """Test find_one and find queries."""
    item_repo.insert_one({"name": "Alpha", "category": "A"})
    item_repo.insert_one({"name": "Beta", "category": "B"})
    item_repo.insert_one({"name": "Gamma", "category": "A"})

    # Find one
    item = item_repo.find_one({"category": "B"})
    assert item is not None
    assert item["name"] == "Beta"

    # Find all with category A
    items_a = item_repo.find({"category": "A"})
    assert len(items_a) == 2

def test_find_paginated(item_repo):
    """Test pagination metadata and item slicing."""
    for i in range(15):
        item_repo.insert_one({"name": f"Item {i}", "index": i})

    # Page 1 (10 items)
    result = item_repo.find_paginated(page=1, page_size=10)
    assert result["total"] == 15
    assert len(result["items"]) == 10
    assert result["page"] == 1
    assert result["total_pages"] == 2
    assert result["has_next"] is True
    assert result["has_prev"] is False

    # Page 2 (5 items)
    result_p2 = item_repo.find_paginated(page=2, page_size=10)
    assert len(result_p2["items"]) == 5
    assert result_p2["page"] == 2
    assert result_p2["has_next"] is False
    assert result_p2["has_prev"] is True

def test_update_by_id(item_repo):
    """Test updating a document by ID."""
    inserted = item_repo.insert_one({"name": "Old Name", "status": "PENDING"})
    updated = item_repo.update_by_id(inserted["id"], {"name": "New Name", "status": "ACTIVE"})

    assert updated is not None
    assert updated["name"] == "New Name"
    assert updated["status"] == "ACTIVE"

def test_delete_by_id(item_repo):
    """Test deleting a document by ID."""
    inserted = item_repo.insert_one({"name": "To Delete"})
    assert item_repo.count() == 1

    deleted = item_repo.delete_by_id(inserted["id"])
    assert deleted is True
    assert item_repo.count() == 0

    # Deleting non-existent should return False
    deleted_again = item_repo.delete_by_id(inserted["id"])
    assert deleted_again is False
