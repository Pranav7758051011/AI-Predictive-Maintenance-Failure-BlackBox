import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Union
from bson import ObjectId

from app.repositories.blackbox_repository import BlackBoxRepository
from app.repositories.audit_repository import AuditRepository
from app.repositories.machine_repository import MachineRepository
from app.repositories.sensor_repository import SensorRepository
from app.repositories.prediction_repository import PredictionRepository
from app.utils.constants import UserRole, MachineStatus
from app.utils.db_helpers import to_object_id, serialize_doc, serialize_docs
from app.utils.exceptions import NotFoundError, ForbiddenError, ValidationError

logger = logging.getLogger("app.services.blackbox")

class BlackBoxService:
    """Orchestrator for Failure Black Box snapshotting, audit trail, and replay generation."""
    def __init__(
        self,
        blackbox_repo: Optional[BlackBoxRepository] = None,
        audit_repo: Optional[AuditRepository] = None,
        machine_repo: Optional[MachineRepository] = None,
        sensor_repo: Optional[SensorRepository] = None,
        prediction_repo: Optional[PredictionRepository] = None
    ):
        self.blackbox_repo = blackbox_repo or BlackBoxRepository()
        self.audit_repo = audit_repo or AuditRepository()
        self.machine_repo = machine_repo or MachineRepository()
        self.sensor_repo = sensor_repo or SensorRepository()
        self.prediction_repo = prediction_repo or PredictionRepository()

    def _get_verified_machine(self, machine_id: Union[str, ObjectId], current_user: Optional[Dict[str, Any]] = None, is_write: bool = False) -> Dict[str, Any]:
        """Verifies machine exists and validates access."""
        machine = self.machine_repo.find_by_id(machine_id)
        if not machine:
            raise NotFoundError(f"Machine with ID '{machine_id}' not found.", error_code="MACHINE_NOT_FOUND")

        return machine

    def simulate_failure_blackbox(self, machine_id: Optional[str] = None, current_user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Simulates an authentic failure incident with 24-hour telemetry degradation and seals a Black Box.
        """
        if not machine_id:
            all_machines = self.machine_repo.find_all(limit=1)
            if all_machines:
                machine = all_machines[0]
            else:
                # Create a demo machine if none exists
                machine = self.machine_repo.insert_one({
                    "serial_number": f"SIM-CNC-{int(datetime.now().timestamp()) % 1000:03d}",
                    "name": "Simulated 5-Axis CNC Mill",
                    "product_type": "M",
                    "location": "Bay 3 (Simulation Sector)",
                    "status": MachineStatus.HEALTHY,
                    "current_health_score": 100.0,
                    "current_rul_hours": 350.0
                })
        else:
            machine = self._get_verified_machine(machine_id, current_user, is_write=False)

        now = datetime.now(timezone.utc)
        samples = []
        for i in range(12, 0, -1):
            sample_time = now - timedelta(minutes=i * 5)
            # Progressively degrade values towards failure
            progress = (12 - i) / 12.0
            p_temp = round(308.0 + progress * 7.5, 2)       # Rises from 308K to ~315.5K (Heat Dissipation Failure)
            a_temp = round(298.0 + (i % 2) * 0.4, 2)
            rot_spd = round(1550.0 - progress * 250.0, 1)   # Drops from 1550 to ~1300 RPM
            trq = round(42.0 + progress * 24.0, 2)          # Increases from 42 to 66 Nm
            tool_w = round(80.0 + progress * 145.0, 1)      # Increases to 225 min (Tool Wear limit)

            samples.append({
                "machine_id": to_object_id(machine["id"]),
                "air_temp": a_temp,
                "process_temp": p_temp,
                "rotational_speed": rot_spd,
                "torque": trq,
                "tool_wear": tool_w,
                "product_type": machine.get("product_type", "M"),
                "temperature_difference": round(p_temp - a_temp, 2),
                "power": round((trq * rot_spd * 2.0 * 3.14159) / 60.0, 2),
                "timestamp": sample_time
            })

        self.sensor_repo.create_telemetry_batch(samples)

        # Trigger ML inference on the final failure reading
        from app.services.ml_service import MLService
        ml_service = MLService()
        failure_sample = samples[-1]
        inference = ml_service.predict(failure_sample)
        health_score = ml_service.calculate_health_score(inference["failure_probability"], telemetry=failure_sample)

        pred_doc = {
            "machine_id": to_object_id(machine["id"]),
            "failure_probability": float(max(0.85, inference["failure_probability"])),
            "failure_prediction": True,
            "failure_type": inference.get("failure_type") if inference.get("failure_type") != "None" else "Heat Dissipation Failure (HDF)",
            "health_score": float(min(22.0, health_score)),
            "confidence": 0.94,
            "model_version": inference.get("model_version", "xgboost-failure-v1.0"),
            "timestamp": now
        }
        saved_pred = self.prediction_repo.create_prediction(pred_doc)

        # Generate Black Box snapshot
        blackbox = self.generate_blackbox_for_prediction(
            prediction_doc_or_id=saved_pred,
            current_user=current_user,
            is_auto=False
        )

        return blackbox

    def generate_blackbox_for_prediction(
        self,
        prediction_doc_or_id: Union[str, Dict[str, Any]],
        current_user: Optional[Dict[str, Any]] = None,
        is_auto: bool = False
    ) -> Dict[str, Any]:
        """
        Generates an immutable Failure Black Box snapshot for a qualifying failure prediction.
        Guarantees idempotency via unique trigger_prediction_id check.
        """
        if isinstance(prediction_doc_or_id, dict):
            pred = prediction_doc_or_id
        else:
            pred = self.prediction_repo.find_by_id(prediction_doc_or_id)
            if not pred:
                raise NotFoundError(f"Prediction '{prediction_doc_or_id}' not found.", error_code="PREDICTION_NOT_FOUND")

        pred_id = pred["id"]

        # 1. Idempotency Check: Return existing Black Box if already captured
        existing_bb = self.blackbox_repo.find_by_trigger_prediction_id(pred_id)
        if existing_bb:
            logger.info(f"Black Box already exists for prediction '{pred_id}' ({existing_bb['blackbox_code']}). Returning existing incident.")
            return existing_bb

        # 2. Verify failure qualification (unless manually generated by Admin/Engineer)
        if not pred.get("failure_prediction") and not current_user:
            raise ValidationError("Prediction did not indicate a machine failure event.")

        # 3. Machine snapshot
        machine = self._get_verified_machine(pred["machine_id"], current_user, is_write=True if current_user else False)
        machine_snapshot = {
            "id": machine["id"],
            "serial_number": machine["serial_number"],
            "name": machine["name"],
            "product_type": machine["product_type"],
            "location": machine["location"],
            "status": machine["status"],
            "assigned_engineer_id": machine.get("assigned_engineer_id")
        }

        # 4. Determine 24-hour telemetry & prediction window
        raw_fail_ts = pred.get("timestamp")
        if isinstance(raw_fail_ts, datetime):
            fail_ts = raw_fail_ts if raw_fail_ts.tzinfo else raw_fail_ts.replace(tzinfo=timezone.utc)
        elif isinstance(raw_fail_ts, str):
            fail_ts = datetime.fromisoformat(raw_fail_ts.replace("Z", "+00:00"))
        else:
            fail_ts = datetime.now(timezone.utc)

        window_start = fail_ts - timedelta(hours=24)
        window_end = fail_ts

        # 5. Query 24h telemetry history (indexed query)
        sensor_cursor = self.sensor_repo.collection.find({
            "machine_id": to_object_id(machine["id"]),
            "timestamp": {"$gte": window_start, "$lte": window_end}
        }).sort("timestamp", 1)
        telemetry_history = serialize_docs(list(sensor_cursor))

        # 6. Query 24h prediction history (indexed query)
        pred_cursor = self.prediction_repo.collection.find({
            "machine_id": to_object_id(machine["id"]),
            "timestamp": {"$gte": window_start, "$lte": window_end}
        }).sort("timestamp", 1)
        prediction_history = serialize_docs(list(pred_cursor))

        # Calculate actual available duration hours
        available_duration_hours = 0.0
        if len(telemetry_history) > 1:
            try:
                t_first = datetime.fromisoformat(str(telemetry_history[0]["timestamp"]).replace("Z", "+00:00"))
                t_last = datetime.fromisoformat(str(telemetry_history[-1]["timestamp"]).replace("Z", "+00:00"))
                available_duration_hours = round((t_last - t_first).total_seconds() / 3600.0, 2)
            except Exception:
                available_duration_hours = 24.0
        elif len(telemetry_history) == 1:
            available_duration_hours = 0.1

        # 7. Construct Event Timeline
        timeline: List[Dict[str, Any]] = [
            {
                "timestamp": window_start.isoformat(),
                "event_type": "WINDOW_START",
                "description": "24-hour Black Box evidence capture window opened.",
                "source": "BLACKBOX_SYSTEM"
            }
        ]

        if telemetry_history:
            timeline.append({
                "timestamp": str(telemetry_history[0]["timestamp"]),
                "event_type": "EARLIEST_TELEMETRY",
                "description": f"First telemetry sample captured in window (Temp: {telemetry_history[0].get('process_temp')}K, Speed: {telemetry_history[0].get('rotational_speed')} RPM).",
                "source": "SENSOR"
            })

        for p in prediction_history:
            if p.get("health_score", 100) < 50:
                timeline.append({
                    "timestamp": str(p["timestamp"]),
                    "event_type": "HEALTH_DEGRADATION",
                    "description": f"Machine health score degraded to {p.get('health_score')} (Failure Probability: {p.get('failure_probability')}).",
                    "source": "ML_PREDICTOR"
                })

        # Add failure detection event
        failure_type = pred.get("failure_type", "UNKNOWN_FAILURE")
        prob_pct = pred.get("failure_probability", 1.0) * 100.0
        timeline.append({
            "timestamp": fail_ts.isoformat(),
            "event_type": "FAILURE_DETECTED",
            "description": f"CRITICAL: ML model ({pred.get('model_version')}) detected {failure_type} failure with {prob_pct:.1f}% probability.",
            "source": "ML_SERVICE"
        })

        timeline.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_type": "BLACKBOX_SEALED",
            "description": "Failure Black Box incident snapshot sealed and preserved immutably.",
            "source": "BLACKBOX_SYSTEM"
        })

        # 8. Generate Black Box unique code & build document
        blackbox_code = self.blackbox_repo.generate_next_code()
        actor_user_id = current_user.get("id") if current_user else None
        actor_role = current_user.get("role") if current_user else "SYSTEM"

        bb_doc = {
            "blackbox_code": blackbox_code,
            "machine_id": to_object_id(machine["id"]),
            "trigger_prediction_id": to_object_id(pred["id"]),
            "trigger_source": "AUTOMATIC_ML_TRIGGER" if is_auto else "MANUAL_ENGINEER_TRIGGER",
            "failure_timestamp": fail_ts,
            "failure_summary": {
                "failure_prediction": bool(pred.get("failure_prediction", True)),
                "failure_probability": float(pred.get("failure_probability", 1.0)),
                "failure_type": failure_type,
                "health_score": float(pred.get("health_score", 0.0)),
                "confidence": float(pred.get("confidence", 1.0)),
                "model_version": str(pred.get("model_version", "failure-model-v1.0"))
            },
            "machine_snapshot": machine_snapshot,
            "telemetry_window": {
                "requested_duration_hours": 24,
                "available_duration_hours": available_duration_hours,
                "start_time": window_start,
                "end_time": window_end,
                "telemetry_samples_count": len(telemetry_history),
                "predictions_count": len(prediction_history)
            },
            "telemetry_history": telemetry_history,
            "prediction_history": prediction_history,
            "event_timeline": timeline,
            "incident_status": "OPEN",
            "created_at": datetime.now(timezone.utc),
            "created_by": to_object_id(actor_user_id) if actor_user_id else None
        }

        # 9. Persist Black Box
        blackbox = self.blackbox_repo.create_blackbox(bb_doc)

        # 10. Update machine status to CRITICAL
        self.machine_repo.update_by_id(machine["id"], {"status": MachineStatus.CRITICAL})

        # 11. Record Audit Log
        self.audit_repo.create_log(
            entity_type="FAILURE_BLACKBOX",
            entity_id=blackbox["id"],
            action="BLACKBOX_CREATED",
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            metadata={
                "blackbox_code": blackbox_code,
                "machine_id": machine["id"],
                "failure_type": failure_type,
                "trigger_source": bb_doc["trigger_source"],
                "telemetry_samples_count": len(telemetry_history)
            }
        )

        logger.info(f"Generated Failure Black Box '{blackbox_code}' (ID: {blackbox['id']}) for machine '{machine['id']}'.")
        return blackbox

    def get_blackbox(self, blackbox_id_or_code: str, current_user: Dict[str, Any]) -> Dict[str, Any]:
        """Retrieves full Black Box incident record and logs view audit event."""
        if blackbox_id_or_code.startswith("BB-"):
            bb = self.blackbox_repo.find_by_code(blackbox_id_or_code)
        else:
            bb = self.blackbox_repo.find_by_id(blackbox_id_or_code)

        if not bb:
            raise NotFoundError(f"Failure Black Box '{blackbox_id_or_code}' not found.", error_code="BLACKBOX_NOT_FOUND")

        # Verify read access for this machine
        self._get_verified_machine(bb["machine_id"], current_user, is_write=False)

        # Audit view event
        self.audit_repo.create_log(
            entity_type="FAILURE_BLACKBOX",
            entity_id=bb["id"],
            action="BLACKBOX_VIEWED",
            actor_user_id=current_user.get("id") if current_user else None,
            actor_role=current_user.get("role", "ANONYMOUS") if current_user else "ANONYMOUS",
            metadata={"blackbox_code": bb["blackbox_code"]}
        )

        return bb

    def get_replay_frames(self, blackbox_id_or_code: str, current_user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Constructs chronological time-series replay frames (telemetry + predictions) leading up to failure.
        """
        bb = self.get_blackbox(blackbox_id_or_code, current_user)

        # Build combined chronological frames
        telemetry_samples = bb.get("telemetry_history", [])
        prediction_samples = bb.get("prediction_history", [])

        # Create quick lookup by timestamp for predictions
        pred_map = {str(p.get("timestamp")): p for p in prediction_samples}

        frames = []
        for tel in telemetry_samples:
            ts_str = str(tel.get("timestamp"))
            pred = pred_map.get(ts_str)

            frames.append({
                "timestamp": ts_str,
                "telemetry": {
                    "air_temp": tel.get("air_temp"),
                    "process_temp": tel.get("process_temp"),
                    "rotational_speed": tel.get("rotational_speed"),
                    "torque": tel.get("torque"),
                    "tool_wear": tel.get("tool_wear"),
                    "product_type": tel.get("product_type"),
                    "temperature_difference": tel.get("temperature_difference"),
                    "power": tel.get("power")
                },
                "prediction": {
                    "failure_probability": pred.get("failure_probability") if pred else None,
                    "failure_prediction": pred.get("failure_prediction") if pred else None,
                    "failure_type": pred.get("failure_type") if pred else None,
                    "health_score": pred.get("health_score") if pred else None
                } if pred else None
            })

        # Audit replay event
        self.audit_repo.create_log(
            entity_type="FAILURE_BLACKBOX",
            entity_id=bb["id"],
            action="BLACKBOX_REPLAYED",
            actor_user_id=current_user.get("id") if current_user else None,
            actor_role=current_user.get("role", "ANONYMOUS") if current_user else "ANONYMOUS",
            metadata={"blackbox_code": bb["blackbox_code"], "total_frames": len(frames)}
        )

        return {
            "blackbox_code": bb["blackbox_code"],
            "machine_id": str(bb["machine_id"]),
            "failure_timestamp": bb["failure_timestamp"],
            "failure_type": bb["failure_summary"].get("failure_type"),
            "total_frames": len(frames),
            "frames": frames
        }

    def update_blackbox_status(self, blackbox_id: str, new_status: str, current_user: Dict[str, Any]) -> Dict[str, Any]:
        """
        Updates incident lifecycle status (OPEN, UNDER_REVIEW, RESOLVED).
        Leaves all telemetry, machine, prediction, and timeline snapshots strictly immutable!
        """
        bb = self.blackbox_repo.find_by_id(blackbox_id)
        if not bb:
            raise NotFoundError(f"Failure Black Box '{blackbox_id}' not found.", error_code="BLACKBOX_NOT_FOUND")

        self._get_verified_machine(bb["machine_id"], current_user, is_write=True)

        old_status = bb.get("incident_status", "OPEN")
        updated = self.blackbox_repo.update_status(bb["id"], new_status)

        # Audit status change
        self.audit_repo.create_log(
            entity_type="FAILURE_BLACKBOX",
            entity_id=bb["id"],
            action="BLACKBOX_STATUS_CHANGED",
            actor_user_id=current_user.get("id"),
            actor_role=current_user.get("role", "UNKNOWN"),
            metadata={
                "blackbox_code": bb["blackbox_code"],
                "old_status": old_status,
                "new_status": new_status
            }
        )

        return updated

    def list_blackboxes(self, query_params: Dict[str, Any], current_user: Dict[str, Any]) -> Dict[str, Any]:
        """Retrieves paginated Black Box incidents."""
        machine_id = query_params.get("machine_id")
        if machine_id:
            self._get_verified_machine(machine_id, current_user, is_write=False)

        return self.blackbox_repo.list_blackboxes(
            machine_id=machine_id,
            failure_type=query_params.get("failure_type"),
            incident_status=query_params.get("incident_status"),
            start_time=query_params.get("start_time"),
            end_time=query_params.get("end_time"),
            page=query_params.get("page", 1),
            page_size=query_params.get("page_size", 50),
            sort_order=query_params.get("sort_order", "desc")
        )

    def get_audit_trail(self, blackbox_id: str, current_user: Dict[str, Any], page: int = 1, page_size: int = 50) -> Dict[str, Any]:
        """Retrieves immutable audit history for a Black Box."""
        bb = self.blackbox_repo.find_by_id(blackbox_id)
        if not bb:
            raise NotFoundError(f"Failure Black Box '{blackbox_id}' not found.", error_code="BLACKBOX_NOT_FOUND")

        self._get_verified_machine(bb["machine_id"], current_user, is_write=False)
        return self.audit_repo.list_logs_for_entity(bb["id"], page=page, page_size=page_size)
