import re
from typing import Dict, Any, Optional, List, Union
from bson import ObjectId
from app.repositories.machine_repository import MachineRepository
from app.repositories.user_repository import UserRepository
from app.utils.constants import UserRole, MachineStatus
from app.utils.db_helpers import to_object_id
from app.utils.exceptions import NotFoundError, ConflictError, ValidationError, ForbiddenError

class MachineService:
    """Business logic service for industrial machine fleet management and assignment."""
    def __init__(
        self, 
        machine_repo: MachineRepository = None, 
        user_repo: UserRepository = None
    ):
        self.machine_repo = machine_repo or MachineRepository()
        self.user_repo = user_repo or UserRepository()

    def _hydrate_machine(self, machine: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Attaches brief engineer metadata if assigned_engineer_id is present."""
        if not machine:
            return None
        
        engineer_id = machine.get("assigned_engineer_id")
        if engineer_id:
            engineer = self.user_repo.find_by_id(str(engineer_id))
            if engineer:
                machine["assigned_engineer"] = {
                    "id": engineer["id"],
                    "email": engineer["email"],
                    "full_name": engineer["full_name"],
                    "role": engineer["role"]
                }
            else:
                machine["assigned_engineer"] = None
        else:
            machine["assigned_engineer"] = None
            
        return machine

    def create_machine(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Creates a new machine in the fleet after verifying serial number uniqueness."""
        serial_number = data["serial_number"].strip().upper()
        
        if self.machine_repo.is_serial_number_registered(serial_number):
            raise ConflictError(
                f"Machine with serial number '{serial_number}' already exists.",
                error_code="SERIAL_NUMBER_EXISTS"
            )

        assigned_engineer_obj_id = None
        if data.get("assigned_engineer_id"):
            eng_id = data["assigned_engineer_id"]
            engineer = self.user_repo.find_by_id(eng_id)
            if not engineer:
                raise ValidationError(f"Assigned engineer with ID '{eng_id}' not found.")
            if engineer.get("role") != UserRole.ENGINEER:
                raise ValidationError(f"User '{engineer.get('full_name')}' is a {engineer.get('role')}, not an ENGINEER.")
            assigned_engineer_obj_id = to_object_id(eng_id)

        machine_doc = {
            "serial_number": serial_number,
            "name": data["name"].strip(),
            "product_type": data["product_type"].upper(),
            "location": data["location"].strip(),
            "status": data.get("status", MachineStatus.HEALTHY),
            "current_health_score": 100.0,
            "current_rul_hours": 500.0,
            "assigned_engineer_id": assigned_engineer_obj_id,
            "specifications": data.get("specifications", {
                "rated_power_kw": 15.0,
                "max_torque_nm": 80.0,
                "max_rpm": 3000
            })
        }

        created = self.machine_repo.insert_one(machine_doc)
        return self._hydrate_machine(created)

    def get_machine(self, machine_id: str, current_user: Dict[str, Any]) -> Dict[str, Any]:
        """
        Retrieves machine by ID with permission checks.
        If current_user is ENGINEER and machine has an assigned engineer that differs,
        access is restricted.
        """
        machine = self.machine_repo.find_by_id(machine_id)
        if not machine:
            raise NotFoundError(f"Machine with ID '{machine_id}' not found.", error_code="MACHINE_NOT_FOUND")

        # Check engineer assignment permissions
        user_role = current_user.get("role")
        user_id = str(current_user.get("id"))
        
        if user_role == UserRole.ENGINEER:
            assigned_id = machine.get("assigned_engineer_id")
            # If machine is assigned to someone else, reject
            if assigned_id and str(assigned_id) != user_id:
                raise ForbiddenError(
                    "Access forbidden: You are only authorized to view machines assigned to you.",
                    error_code="MACHINE_ACCESS_DENIED"
                )

        return self._hydrate_machine(machine)

    def list_machines(self, query_params: Dict[str, Any], current_user: Dict[str, Any]) -> Dict[str, Any]:
        """Lists machines with filtering, search, pagination, and role-based scoping."""
        page = query_params.get("page", 1)
        page_size = query_params.get("page_size", 20)
        status_filter = query_params.get("status")
        type_filter = query_params.get("product_type")
        eng_filter = query_params.get("assigned_engineer_id")
        search_query = query_params.get("search")

        mongo_filter: Dict[str, Any] = {}

        # Role-based scoping for Engineers
        user_role = current_user.get("role")
        user_id = str(current_user.get("id"))
        
        if user_role == UserRole.ENGINEER:
            # Engineers only see machines assigned to them or unassigned machines
            mongo_filter["$or"] = [
                {"assigned_engineer_id": to_object_id(user_id)},
                {"assigned_engineer_id": None}
            ]

        if status_filter and status_filter.upper() != "ALL":
            mongo_filter["status"] = status_filter.upper()

        if type_filter and type_filter.upper() != "ALL":
            mongo_filter["product_type"] = type_filter.upper()

        if eng_filter and user_role != UserRole.ENGINEER:
            if eng_filter.lower() == "unassigned":
                mongo_filter["assigned_engineer_id"] = None
            else:
                mongo_filter["assigned_engineer_id"] = to_object_id(eng_filter)

        if search_query:
            regex_pattern = {"$regex": re.escape(search_query.strip()), "$options": "i"}
            mongo_filter["$or"] = [
                {"name": regex_pattern},
                {"serial_number": regex_pattern},
                {"location": regex_pattern}
            ]

        paginated_result = self.machine_repo.find_paginated(
            filter_query=mongo_filter,
            page=page,
            page_size=page_size,
            sort=[("created_at", -1)]
        )

        # Hydrate all returned machine items
        paginated_result["items"] = [
            self._hydrate_machine(item) for item in paginated_result["items"]
        ]

        return paginated_result

    def update_machine(self, machine_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Updates machine metadata, status, specifications, or assigned engineer."""
        existing = self.machine_repo.find_by_id(machine_id)
        if not existing:
            raise NotFoundError(f"Machine with ID '{machine_id}' not found.", error_code="MACHINE_NOT_FOUND")

        update_payload: Dict[str, Any] = {}

        if "name" in data and data["name"]:
            update_payload["name"] = data["name"].strip()

        if "product_type" in data and data["product_type"]:
            update_payload["product_type"] = data["product_type"].upper()

        if "location" in data and data["location"]:
            update_payload["location"] = data["location"].strip()

        if "status" in data and data["status"]:
            update_payload["status"] = data["status"].upper()

        if "specifications" in data and data["specifications"]:
            # Merge specifications
            current_specs = existing.get("specifications", {})
            current_specs.update(data["specifications"])
            update_payload["specifications"] = current_specs

        if "assigned_engineer_id" in data:
            eng_id = data["assigned_engineer_id"]
            if eng_id is None or eng_id == "":
                update_payload["assigned_engineer_id"] = None
            else:
                engineer = self.user_repo.find_by_id(eng_id)
                if not engineer:
                    raise ValidationError(f"Assigned engineer with ID '{eng_id}' not found.")
                if engineer.get("role") != UserRole.ENGINEER:
                    raise ValidationError(f"User '{engineer.get('full_name')}' is a {engineer.get('role')}, not an ENGINEER.")
                update_payload["assigned_engineer_id"] = to_object_id(eng_id)

        if not update_payload:
            raise ValidationError("No valid fields provided for update.")

        updated = self.machine_repo.update_by_id(machine_id, update_payload)
        return self._hydrate_machine(updated)

    def delete_machine(self, machine_id: str) -> bool:
        """Deletes a machine from the system."""
        existing = self.machine_repo.find_by_id(machine_id)
        if not existing:
            raise NotFoundError(f"Machine with ID '{machine_id}' not found.", error_code="MACHINE_NOT_FOUND")

        return self.machine_repo.delete_by_id(machine_id)
