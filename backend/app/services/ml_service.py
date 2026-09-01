import logging
from typing import Dict, Any, Optional
from app.ml.predictor import FailurePredictor

logger = logging.getLogger("app.services.ml")

class MLService:
    """Service layer for AI/ML inference, feature extraction, and health score computation."""
    def __init__(self, predictor: Optional[FailurePredictor] = None):
        self.predictor = predictor or FailurePredictor()

    def predict(self, telemetry: Dict[str, Any], threshold: Optional[float] = None) -> Dict[str, Any]:
        """Runs 2-stage inference and returns structured prediction results."""
        return self.predictor.predict(telemetry, threshold=threshold)

    def calculate_health_score(self, failure_probability: float, telemetry: Optional[Dict[str, Any]] = None) -> float:
        """
        Calculates a transparent, deterministic machine Health Score (0.0 to 100.0).
        
        Methodology:
        - Baseline health score is directly inversely proportional to failure probability:
            Base_Score = 100 * (1 - failure_probability)
        - Minor operational stress penalties applied if tool wear or temperature differential exceed critical operational bands.
        """
        base_score = 100.0 * (1.0 - failure_probability)
        
        penalties = 0.0
        if telemetry:
            tool_wear = float(telemetry.get("tool_wear", 0.0))
            if tool_wear > 200.0:
                penalties += min(15.0, (tool_wear - 200.0) * 0.1)

            air_temp = float(telemetry.get("air_temp", 298.0))
            process_temp = float(telemetry.get("process_temp", 308.0))
            temp_diff = process_temp - air_temp
            if temp_diff > 12.0:
                penalties += min(10.0, (temp_diff - 12.0) * 2.0)

        health_score = max(0.0, min(100.0, round(base_score - penalties, 2)))
        return health_score

    def get_model_info(self) -> Dict[str, Any]:
        """Returns model metadata, version, and training status."""
        return {
            "model_version": self.predictor.model_version,
            "is_loaded": self.predictor.is_loaded,
            "default_threshold": self.predictor.default_threshold,
            "metadata": self.predictor.metadata
        }
