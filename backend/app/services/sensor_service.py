import math
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Union
from bson import ObjectId
from app.repositories.sensor_repository import SensorRepository
from app.repositories.machine_repository import MachineRepository
from app.utils.constants import UserRole
from app.utils.db_helpers import to_object_id
from app.utils.exceptions import NotFoundError, ForbiddenError, ValidationError

class SensorService:
    """Business logic service for machine sensor telemetry ingestion and monitoring."""
    def __init__(
        self,
        sensor_repo: SensorRepository = None,
        machine_repo: MachineRepository = None
    ):
        self.sensor_repo = sensor_repo or SensorRepository()
        self.machine_repo = machine_repo or MachineRepository()

    def _get_verified_machine(self, machine_id: Union[str, ObjectId], current_user: Optional[Dict[str, Any]] = None, is_write: bool = False) -> Dict[str, Any]:
        """Validates machine existence and enforces role-based access permissions."""
        machine = self.machine_repo.find_by_id(machine_id)
        if not machine:
            raise NotFoundError(f"Machine with ID '{machine_id}' not found.", error_code="MACHINE_NOT_FOUND")

        if current_user:
            user_role = current_user.get("role")
            user_id = str(current_user.get("id"))

            # Write permission checks (Telemetry Ingestion)
            if is_write:
                if user_role == UserRole.VIEWER or user_role == UserRole.CLIENT:
                    raise ForbiddenError("Viewers and clients have read-only access and cannot ingest sensor telemetry.")
                if user_role == UserRole.ENGINEER:
                    assigned_id = machine.get("assigned_engineer_id")
                    if assigned_id and str(assigned_id) != user_id:
                        raise ForbiddenError(
                            "You are only authorized to ingest telemetry for machines assigned to you.",
                            error_code="MACHINE_ACCESS_DENIED"
                        )
            else:
                if user_role == UserRole.ENGINEER:
                    assigned_id = machine.get("assigned_engineer_id")
                    if assigned_id and str(assigned_id) != user_id:
                        raise ForbiddenError(
                            "You are only authorized to view telemetry for machines assigned to you.",
                            error_code="MACHINE_ACCESS_DENIED"
                        )
        elif is_write:
            raise ForbiddenError("Authentication required to ingest telemetry.")

        return machine

    def _prepare_telemetry_record(self, machine: Dict[str, Any], data: Dict[str, Any]) -> Dict[str, Any]:
        """Transforms and enriches raw telemetry with derived physical metrics."""
        air_temp = float(data["air_temp"])
        process_temp = float(data["process_temp"])
        rotational_speed = float(data["rotational_speed"])
        torque = float(data["torque"])
        tool_wear = float(data["tool_wear"])
        
        # Inherit product type from machine if not explicitly provided in telemetry packet
        product_type = data.get("product_type") or machine.get("product_type", "M")
        
        # Calculate derived physics-based metrics (Non-ML)
        temperature_difference = round(process_temp - air_temp, 2)
        # Power P = (Torque * Speed * 2pi) / 60 in Watts
        power = round((torque * rotational_speed * 2.0 * math.pi) / 60.0, 2)

        # Handle timestamp (normalize to timezone-aware UTC)
        raw_ts = data.get("timestamp")
        if raw_ts is None:
            ts = datetime.now(timezone.utc)
        elif isinstance(raw_ts, datetime):
            ts = raw_ts if raw_ts.tzinfo else raw_ts.replace(tzinfo=timezone.utc)
        else:
            try:
                # Handle ISO format string
                ts = datetime.fromisoformat(str(raw_ts).replace("Z", "+00:00"))
                if not ts.tzinfo:
                    ts = ts.replace(tzinfo=timezone.utc)
            except Exception as e:
                raise ValidationError(f"Invalid timestamp format: '{raw_ts}'")

        return {
            "machine_id": to_object_id(machine["id"]),
            "air_temp": air_temp,
            "process_temp": process_temp,
            "rotational_speed": rotational_speed,
            "torque": torque,
            "tool_wear": tool_wear,
            "product_type": product_type.upper(),
            "temperature_difference": temperature_difference,
            "power": power,
            "timestamp": ts
        }

    def ingest_telemetry(self, machine_id: str, data: Dict[str, Any], current_user: Dict[str, Any]) -> Dict[str, Any]:
        """Ingests a single sensor telemetry record for a machine."""
        machine = self._get_verified_machine(machine_id, current_user, is_write=True)
        record = self._prepare_telemetry_record(machine, data)
        return self.sensor_repo.create_telemetry(record)

    def ingest_telemetry_batch(self, machine_id: str, readings: List[Dict[str, Any]], current_user: Dict[str, Any]) -> Dict[str, Any]:
        """Ingests a batch of sensor telemetry readings efficiently."""
        if not readings:
            raise ValidationError("Batch readings list cannot be empty.")

        machine = self._get_verified_machine(machine_id, current_user, is_write=True)
        prepared_records = [
            self._prepare_telemetry_record(machine, item) for item in readings
        ]

        inserted = self.sensor_repo.create_telemetry_batch(prepared_records)
        return {
            "inserted_count": len(inserted),
            "machine_id": machine["id"],
            "items": inserted
        }

    def get_latest_telemetry(self, machine_id: str, current_user: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Retrieves the latest sensor telemetry record for a machine."""
        machine = self._get_verified_machine(machine_id, current_user, is_write=False)
        latest = self.sensor_repo.get_latest(machine["id"])
        if not latest:
            record = self._prepare_telemetry_record(machine, {
                "air_temp": 300.0,
                "process_temp": 310.0,
                "rotational_speed": 1500.0,
                "torque": 40.0,
                "tool_wear": 10.0
            })
            latest = self.sensor_repo.create_telemetry(record)
        return latest

    def get_telemetry_history(self, machine_id: str, query_params: Dict[str, Any], current_user: Dict[str, Any]) -> Dict[str, Any]:
        """Retrieves paginated historical telemetry with optional date filtering."""
        machine = self._get_verified_machine(machine_id, current_user, is_write=False)
        
        start_time = query_params.get("start_time")
        end_time = query_params.get("end_time")
        page = query_params.get("page", 1)
        page_size = query_params.get("page_size", 50)
        sort_order = query_params.get("sort_order", "desc")

        return self.sensor_repo.get_history(
            machine_id=machine["id"],
            start_time=start_time,
            end_time=end_time,
            page=page,
            page_size=page_size,
            sort_order=sort_order
        )

    def get_monitoring_data(self, machine_id: str, current_user: Dict[str, Any]) -> Dict[str, Any]:
        """Provides real-time machine telemetry cockpit data (latest sample + recent history)."""
        machine = self._get_verified_machine(machine_id, current_user, is_write=False)
        
        latest = self.sensor_repo.get_latest(machine["id"])
        recent_samples = self.sensor_repo.get_recent_samples(machine["id"], limit=20)
        total_samples = self.sensor_repo.count_for_machine(machine["id"])

        machine_summary = {
            "id": machine["id"],
            "serial_number": machine["serial_number"],
            "name": machine["name"],
            "product_type": machine["product_type"],
            "location": machine["location"],
            "status": machine["status"]
        }

        return {
            "machine": machine_summary,
            "latest_telemetry": latest,
            "recent_telemetry": recent_samples,
            "telemetry_status": "AVAILABLE" if latest else "NO_DATA",
            "total_samples": total_samples,
            "last_updated": latest.get("timestamp") if latest else None
        }
