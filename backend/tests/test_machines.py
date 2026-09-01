import pytest
from app.utils.constants import MachineStatus, ProductType

def test_create_machine_success(client, admin_user):
    """Test Admin successfully creating an industrial machine."""
    payload = {
        "serial_number": "CNC-MILL-100",
        "name": "5-Axis CNC Milling Center",
        "product_type": ProductType.MEDIUM,
        "location": "Bay 4, Sector C",
        "status": MachineStatus.HEALTHY,
        "specifications": {
            "rated_power_kw": 22.5,
            "max_torque_nm": 110.0,
            "max_rpm": 4500
        }
    }
    response = client.post("/api/machines", json=payload, headers=admin_user["headers"])
    assert response.status_code == 201
    json_data = response.get_json()
    assert json_data["success"] is True
    assert json_data["data"]["serial_number"] == "CNC-MILL-100"
    assert json_data["data"]["product_type"] == ProductType.MEDIUM
    assert json_data["data"]["current_health_score"] == 100.0
    assert json_data["data"]["current_rul_hours"] == 500.0

def test_create_machine_duplicate_serial(client, admin_user):
    """Test duplicate serial number returns 409 Conflict."""
    payload = {
        "serial_number": "DUP-CNC-001",
        "name": "Primary Lathe",
        "product_type": ProductType.HIGH,
        "location": "Bay 1"
    }
    res1 = client.post("/api/machines", json=payload, headers=admin_user["headers"])
    assert res1.status_code == 201

    res2 = client.post("/api/machines", json=payload, headers=admin_user["headers"])
    assert res2.status_code == 409
    assert res2.get_json()["error_code"] == "SERIAL_NUMBER_EXISTS"

def test_create_machine_validation_errors(client, admin_user):
    """Test validation errors on missing/invalid fields."""
    # Missing required name & location
    res1 = client.post("/api/machines", json={
        "serial_number": "INVALID-001",
        "product_type": "M"
    }, headers=admin_user["headers"])
    assert res1.status_code == 422
    assert res1.get_json()["error_code"] == "VALIDATION_ERROR"

    # Invalid product type (not L, M, or H)
    res2 = client.post("/api/machines", json={
        "serial_number": "INVALID-002",
        "name": "Machine",
        "product_type": "X",
        "location": "Bay 1"
    }, headers=admin_user["headers"])
    assert res2.status_code == 422

def test_create_machine_with_assigned_engineer(client, admin_user, engineer_user):
    """Test creating machine and assigning it to an existing engineer."""
    payload = {
        "serial_number": "ENG-ASSIGN-001",
        "name": "Assigned Drill Station",
        "product_type": ProductType.LOW,
        "location": "Bay 2",
        "assigned_engineer_id": str(engineer_user["user"]["id"])
    }
    response = client.post("/api/machines", json=payload, headers=admin_user["headers"])
    assert response.status_code == 201
    json_data = response.get_json()
    assert json_data["data"]["assigned_engineer_id"] == str(engineer_user["user"]["id"])
    assert json_data["data"]["assigned_engineer"] is not None
    assert json_data["data"]["assigned_engineer"]["email"] == "engineer1@plant.com"

def test_create_machine_assign_non_engineer_fails(client, admin_user, viewer_user):
    """Test assigning a Viewer as an assigned engineer fails validation with 422."""
    payload = {
        "serial_number": "FAIL-ASSIGN-001",
        "name": "Drill Station",
        "product_type": ProductType.LOW,
        "location": "Bay 2",
        "assigned_engineer_id": str(viewer_user["user"]["id"])
    }
    response = client.post("/api/machines", json=payload, headers=admin_user["headers"])
    assert response.status_code == 422
    assert "not an ENGINEER" in response.get_json()["message"]

def test_list_machines(client, admin_user):
    """Test listing machines with pagination."""
    # Create 3 machines
    for i in range(3):
        client.post("/api/machines", json={
            "serial_number": f"LIST-CNC-{i:03d}",
            "name": f"Machine {i}",
            "product_type": ProductType.LOW,
            "location": f"Bay {i}"
        }, headers=admin_user["headers"])

    response = client.get("/api/machines?page=1&page_size=2", headers=admin_user["headers"])
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data["success"] is True
    assert len(json_data["data"]["items"]) == 2
    assert json_data["data"]["page"] == 1
    assert json_data["data"]["total"] >= 3

def test_get_machine_by_id(client, admin_user):
    """Test getting single machine details."""
    create_res = client.post("/api/machines", json={
        "serial_number": "GET-CNC-001",
        "name": "Lathe Center",
        "product_type": ProductType.HIGH,
        "location": "Bay 7"
    }, headers=admin_user["headers"])
    machine_id = create_res.get_json()["data"]["id"]

    get_res = client.get(f"/api/machines/{machine_id}", headers=admin_user["headers"])
    assert get_res.status_code == 200
    assert get_res.get_json()["data"]["serial_number"] == "GET-CNC-001"

def test_get_machine_not_found(client, admin_user):
    """Test 404 for non-existent machine ID."""
    fake_id = "507f1f77bcf86cd799439011"
    response = client.get(f"/api/machines/{fake_id}", headers=admin_user["headers"])
    assert response.status_code == 404
    assert response.get_json()["error_code"] == "MACHINE_NOT_FOUND"

def test_get_machine_invalid_id_format(client, admin_user):
    """Test 422 for malformed ObjectId string."""
    response = client.get("/api/machines/not-a-valid-objectid", headers=admin_user["headers"])
    assert response.status_code == 422
    assert response.get_json()["error_code"] == "VALIDATION_ERROR"

def test_engineer_machine_assignment_access_control(client, admin_user, engineer_user, second_engineer_user):
    """
    Test Engineer access control:
    - Engineer 1 can view machine assigned to Engineer 1.
    - Engineer 2 is forbidden (403) from viewing machine assigned to Engineer 1.
    """
    create_res = client.post("/api/machines", json={
        "serial_number": "ENG1-ONLY-001",
        "name": "Restricted Machine for Eng 1",
        "product_type": ProductType.HIGH,
        "location": "Cleanroom 1",
        "assigned_engineer_id": str(engineer_user["user"]["id"])
    }, headers=admin_user["headers"])
    machine_id = create_res.get_json()["data"]["id"]

    # Engineer 1 access (should succeed)
    res_eng1 = client.get(f"/api/machines/{machine_id}", headers=engineer_user["headers"])
    assert res_eng1.status_code == 200
    assert res_eng1.get_json()["data"]["serial_number"] == "ENG1-ONLY-001"

    # Engineer 2 access (should be forbidden 403)
    res_eng2 = client.get(f"/api/machines/{machine_id}", headers=second_engineer_user["headers"])
    assert res_eng2.status_code == 403
    assert res_eng2.get_json()["error_code"] == "MACHINE_ACCESS_DENIED"

def test_update_machine_success(client, admin_user):
    """Test Admin updating machine location and status."""
    create_res = client.post("/api/machines", json={
        "serial_number": "UPDATE-CNC-001",
        "name": "Old Machine Name",
        "product_type": ProductType.LOW,
        "location": "Old Bay"
    }, headers=admin_user["headers"])
    machine_id = create_res.get_json()["data"]["id"]

    update_res = client.put(f"/api/machines/{machine_id}", json={
        "name": "Upgraded Machine Name",
        "location": "New Bay 12",
        "status": MachineStatus.WARNING
    }, headers=admin_user["headers"])
    assert update_res.status_code == 200
    json_data = update_res.get_json()
    assert json_data["data"]["name"] == "Upgraded Machine Name"
    assert json_data["data"]["location"] == "New Bay 12"
    assert json_data["data"]["status"] == MachineStatus.WARNING

def test_delete_machine_success(client, admin_user):
    """Test Admin deleting a machine and verifying subsequent 404."""
    create_res = client.post("/api/machines", json={
        "serial_number": "FINAL-DEL-001",
        "name": "Machine To Remove",
        "product_type": ProductType.LOW,
        "location": "Scrap Bay"
    }, headers=admin_user["headers"])
    machine_id = create_res.get_json()["data"]["id"]

    del_res = client.delete(f"/api/machines/{machine_id}", headers=admin_user["headers"])
    assert del_res.status_code == 200

    # Subsequent GET returns 404
    get_res = client.get(f"/api/machines/{machine_id}", headers=admin_user["headers"])
    assert get_res.status_code == 404
