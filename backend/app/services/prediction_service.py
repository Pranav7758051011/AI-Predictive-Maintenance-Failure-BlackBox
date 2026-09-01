from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Union
from bson import ObjectId

from app.repositories.prediction_repository import PredictionRepository
from app.repositories.machine_repository import MachineRepository
from app.repositories.sensor_repository import SensorRepository
from app.services.ml_service import MLService
from app.utils.constants import UserRole
from app.utils.db_helpers import to_object_id
from app.utils.exceptions import NotFoundError, ForbiddenError, ValidationError

class PredictionService:
    """Orchestrates AI/ML failure inference, health scoring, and persistence."""
    def __init__(
        self,
        prediction_repo: Optional[PredictionRepository] = None,
        machine_repo: Optional[MachineRepository] = None,
        sensor_repo: Optional[SensorRepository] = None,
        ml_service: Optional[MLService] = None
    ):
        self.prediction_repo = prediction_repo or PredictionRepository()
        self.machine_repo = machine_repo or MachineRepository()
        self.sensor_repo = sensor_repo or SensorRepository()
        self.ml_service = ml_service or MLService()

    def _get_verified_machine(self, machine_id: Union[str, ObjectId], current_user: Dict[str, Any], is_write: bool = False) -> Dict[str, Any]:
        """Validates machine existence and role-based permissions."""
        machine = self.machine_repo.find_by_id(machine_id)
        if not machine:
            raise NotFoundError(f"Machine with ID '{machine_id}' not found.", error_code="MACHINE_NOT_FOUND")

        user_role = current_user.get("role")
        user_id = str(current_user.get("id"))

        if is_write:
            if user_role == UserRole.VIEWER:
                raise ForbiddenError("Viewers have read-only access and cannot trigger ML predictions.")
            if user_role == UserRole.ENGINEER:
                assigned_id = machine.get("assigned_engineer_id")
                if assigned_id and str(assigned_id) != user_id:
                    raise ForbiddenError(
                        "You are only authorized to generate predictions for machines assigned to you.",
                        error_code="MACHINE_ACCESS_DENIED"
                    )
        else:
            if user_role == UserRole.ENGINEER:
                assigned_id = machine.get("assigned_engineer_id")
                if assigned_id and str(assigned_id) != user_id:
                    raise ForbiddenError(
                        "You are only authorized to view predictions for machines assigned to you.",
                        error_code="MACHINE_ACCESS_DENIED"
                    )

        return machine

    def predict_from_telemetry(
        self,
        machine_id: str,
        telemetry_data: Dict[str, Any],
        current_user: Dict[str, Any],
        sensor_data_id: Optional[str] = None,
        threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        """Runs ML model prediction on telemetry input, computes health score, and saves prediction."""
        machine = self._get_verified_machine(machine_id, current_user, is_write=True)

        # 1. Run ML inference
        inference = self.ml_service.predict(telemetry_data, threshold=threshold)

        # 2. Compute Health Score
        health_score = self.ml_service.calculate_health_score(
            inference["failure_probability"],
            telemetry=telemetry_data
        )

        # 3. Update machine current_health_score (leave current_rul_hours untouched!)
        self.machine_repo.update_by_id(machine["id"], {
            "current_health_score": health_score
        })

        # 4. Construct prediction document
        pred_doc = {
            "machine_id": to_object_id(machine["id"]),
            "sensor_data_id": to_object_id(sensor_data_id) if sensor_data_id else None,
            "failure_probability": inference["failure_probability"],
            "failure_prediction": inference["failure_prediction"],
            "failure_type": inference["failure_type"],
            "health_score": health_score,
            "confidence": inference["confidence"],
            "model_version": inference["model_version"],
            "timestamp": datetime.now(timezone.utc)
        }

        # 5. Persist to MongoDB
        saved_pred = self.prediction_repo.create_prediction(pred_doc)

        # 6. Automatic Black Box Generation Trigger (if failure detected)
        if saved_pred.get("failure_prediction"):
            try:
                from app.services.blackbox_service import BlackBoxService
                bb_service = BlackBoxService()
                bb = bb_service.generate_blackbox_for_prediction(saved_pred, current_user=current_user, is_auto=True)
                saved_pred["blackbox_id"] = bb.get("id")
                saved_pred["blackbox_code"] = bb.get("blackbox_code")
            except Exception as e:
                import logging
                logging.getLogger("app.services.prediction").error(f"Failed to auto-generate Black Box: {e}", exc_info=True)

        return saved_pred

    def predict_from_latest_telemetry(
        self,
        machine_id: str,
        current_user: Dict[str, Any],
        threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        """Generates a prediction using the latest available sensor telemetry for a machine."""
        machine = self._get_verified_machine(machine_id, current_user, is_write=True)
        latest_telemetry = self.sensor_repo.get_latest(machine["id"])

        if not latest_telemetry:
            raise NotFoundError(
                f"No sensor telemetry available for machine '{machine['id']}'. Cannot generate prediction without telemetry.",
                error_code="NO_TELEMETRY_DATA"
            )

        return self.predict_from_telemetry(
            machine_id=machine["id"],
            telemetry_data=latest_telemetry,
            current_user=current_user,
            sensor_data_id=latest_telemetry.get("id"),
            threshold=threshold
        )

    def get_prediction_by_id(self, prediction_id: str, current_user: Dict[str, Any]) -> Dict[str, Any]:
        """Retrieves a single prediction by ID with access verification."""
        pred = self.prediction_repo.find_by_id(prediction_id)
        if not pred:
            raise NotFoundError(f"Prediction with ID '{prediction_id}' not found.", error_code="PREDICTION_NOT_FOUND")

        # Verify access for the machine associated with this prediction
        self._get_verified_machine(pred["machine_id"], current_user, is_write=False)
        return pred

    def get_machine_health(self, machine_id: str, current_user: Dict[str, Any]) -> Dict[str, Any]:
        """Returns the current health status and latest prediction details for a machine."""
        machine = self._get_verified_machine(machine_id, current_user, is_write=False)
        latest_pred = self.prediction_repo.get_latest_for_machine(machine["id"])

        if not latest_pred:
            raise NotFoundError(
                f"No health predictions recorded yet for machine '{machine['id']}'.",
                error_code="NO_PREDICTION_DATA"
            )

        hs = latest_pred["health_score"]
        if hs >= 90.0:
            health_status = "EXCELLENT"
        elif hs >= 75.0:
            health_status = "GOOD"
        elif hs >= 50.0:
            health_status = "WARNING"
        elif hs >= 25.0:
            health_status = "POOR"
        else:
            health_status = "CRITICAL"

        return {
            "machine_id": machine["id"],
            "health_score": hs,
            "failure_probability": latest_pred["failure_probability"],
            "failure_prediction": latest_pred["failure_prediction"],
            "failure_type": latest_pred["failure_type"],
            "health_status": health_status,
            "confidence": latest_pred["confidence"],
            "model_version": latest_pred["model_version"],
            "timestamp": latest_pred["timestamp"]
        }

    def list_predictions(self, query_params: Dict[str, Any], current_user: Dict[str, Any]) -> Dict[str, Any]:
        """Retrieves paginated predictions with optional filtering."""
        machine_id = query_params.get("machine_id")
        if machine_id:
            # Validate machine access if machine_id filter is specified
            self._get_verified_machine(machine_id, current_user, is_write=False)

        return self.prediction_repo.list_predictions(
            machine_id=machine_id,
            failure_only=query_params.get("failure_only"),
            start_time=query_params.get("start_time"),
            end_time=query_params.get("end_time"),
            page=query_params.get("page", 1),
            page_size=query_params.get("page_size", 50),
            sort_order=query_params.get("sort_order", "desc")
        )
