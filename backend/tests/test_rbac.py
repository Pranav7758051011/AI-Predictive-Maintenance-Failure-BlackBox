import pytest

def test_admin_can_create_machine(client, admin_user):
    """Test Admin has authorization to create machines."""
    payload = {
        "serial_number": "ADMIN-CNC-001",
        "name": "Heavy Industrial CNC",
        "product_type": "H",
        "location": "Sector A, Bay 1"
    }
    response = client.post("/api/machines", json=payload, headers=admin_user["headers"])
    assert response.status_code == 201
    assert response.get_json()["success"] is True

def test_engineer_cannot_create_machine(client, engineer_user):
    """Test Engineer is forbidden from creating machines."""
    payload = {
        "serial_number": "ENG-CNC-001",
        "name": "Heavy Industrial CNC",
        "product_type": "M",
        "location": "Sector A, Bay 2"
    }
    response = client.post("/api/machines", json=payload, headers=engineer_user["headers"])
    assert response.status_code == 403
    json_data = response.get_json()
    assert json_data["success"] is False
    assert json_data["error_code"] == "FORBIDDEN"

def test_viewer_cannot_create_machine(client, viewer_user):
    """Test Viewer is forbidden from creating machines."""
    payload = {
        "serial_number": "VIEW-CNC-001",
        "name": "Heavy Industrial CNC",
        "product_type": "L",
        "location": "Sector A, Bay 3"
    }
    response = client.post("/api/machines", json=payload, headers=viewer_user["headers"])
    assert response.status_code == 403
    assert response.get_json()["error_code"] == "FORBIDDEN"

def test_unauthenticated_cannot_create_machine(client):
    """Test unauthenticated request returns 401 Unauthorized."""
    payload = {
        "serial_number": "NOAUTH-001",
        "name": "Unauthorized Machine",
        "product_type": "L",
        "location": "Sector 0"
    }
    response = client.post("/api/machines", json=payload)
    assert response.status_code == 401
    assert response.get_json()["error_code"] == "AUTHORIZATION_REQUIRED"

def test_admin_can_delete_machine(client, admin_user):
    """Test Admin can delete a machine."""
    create_res = client.post("/api/machines", json={
        "serial_number": "DEL-CNC-001",
        "name": "Machine to Delete",
        "product_type": "M",
        "location": "Bay 9"
    }, headers=admin_user["headers"])
    machine_id = create_res.get_json()["data"]["id"]

    del_res = client.delete(f"/api/machines/{machine_id}", headers=admin_user["headers"])
    assert del_res.status_code == 200
    assert del_res.get_json()["success"] is True

def test_engineer_cannot_delete_machine(client, admin_user, engineer_user):
    """Test Engineer is forbidden from deleting a machine."""
    create_res = client.post("/api/machines", json={
        "serial_number": "ENG-NO-DEL-001",
        "name": "Protected Machine",
        "product_type": "M",
        "location": "Bay 9"
    }, headers=admin_user["headers"])
    machine_id = create_res.get_json()["data"]["id"]

    del_res = client.delete(f"/api/machines/{machine_id}", headers=engineer_user["headers"])
    assert del_res.status_code == 403
    assert del_res.get_json()["error_code"] == "FORBIDDEN"
