import os
import json
import logging
from typing import Dict, Any, Optional
import numpy as np
import xgboost as xgb

from app.ml.preprocessing import (
    FEATURE_COLUMNS,
    FAILURE_TYPE_MAP,
    extract_features_from_dict
)
from app.utils.exceptions import AppException

logger = logging.getLogger("app.ml")

class ModelNotLoadedError(AppException):
    """Raised when prediction is attempted without loaded model artifacts."""
    def __init__(self, message="Trained ML model artifacts are unavailable."):
        super().__init__(message=message, error_code="MODEL_NOT_AVAILABLE", status_code=503)

class FailurePredictor:
    """Inference engine for 2-stage Predictive Maintenance Failure Prediction."""
    def __init__(self, models_dir: Optional[str] = None):
        self.models_dir = models_dir or os.path.join(os.path.dirname(__file__), "models")
        self.binary_booster: Optional[xgb.Booster] = None
        self.multi_booster: Optional[xgb.Booster] = None
        self.metadata: Dict[str, Any] = {}
        self.is_loaded = False
        self._load_models_if_present()

    def _load_models_if_present(self):
        """Attempts to load model artifacts on initialization."""
        bin_path = os.path.join(self.models_dir, "failure_model.json")
        multi_path = os.path.join(self.models_dir, "failure_type_model.json")
        meta_path = os.path.join(self.models_dir, "metadata.json")

        if os.path.exists(bin_path) and os.path.exists(multi_path):
            try:
                self.binary_booster = xgb.Booster()
                self.binary_booster.load_model(bin_path)

                self.multi_booster = xgb.Booster()
                self.multi_booster.load_model(multi_path)

                if os.path.exists(meta_path):
                    with open(meta_path, "r") as f:
                        self.metadata = json.load(f)

                self.is_loaded = True
                logger.info(f"Loaded ML model artifacts (version '{self.model_version}') from '{self.models_dir}'")
            except Exception as e:
                logger.error(f"Failed to load ML model artifacts: {e}", exc_info=True)
                self.is_loaded = False
        else:
            logger.warning(f"Model artifacts not found in '{self.models_dir}'. Run train.py to generate models.")
            self.is_loaded = False

    @property
    def model_version(self) -> str:
        return self.metadata.get("model_version", "failure-model-v1.0")

    @property
    def default_threshold(self) -> float:
        return float(self.metadata.get("failure_probability_threshold", 0.50))

    def predict(self, telemetry: Dict[str, Any], threshold: Optional[float] = None) -> Dict[str, Any]:
        """
        Executes 2-stage inference on a telemetry reading.
        Returns failure probability, binary failure prediction, failure classification, and confidence.
        """
        if not self.is_loaded or self.binary_booster is None or self.multi_booster is None:
            # Re-attempt loading in case models were generated post-startup
            self._load_models_if_present()
            if not self.is_loaded:
                raise ModelNotLoadedError("ML model artifacts are not loaded. Please train or provide model files.")

        feat_vec = extract_features_from_dict(telemetry)
        dmatrix = xgb.DMatrix(feat_vec, feature_names=FEATURE_COLUMNS)

        # Stage 1: Binary Failure Probability
        raw_prob = float(self.binary_booster.predict(dmatrix)[0])
        failure_prob = round(float(np.clip(raw_prob, 0.0, 1.0)), 4)
        
        active_threshold = threshold if threshold is not None else self.default_threshold
        failure_prediction = bool(failure_prob >= active_threshold)

        # Stage 2: Multiclass Failure Type
        multi_probs = self.multi_booster.predict(dmatrix)[0]
        
        if not failure_prediction:
            failure_type = "NO_FAILURE"
            confidence = round(float(1.0 - failure_prob), 4)
        else:
            # Pick highest probability failure type from classes 1..5
            failure_class_probs = multi_probs[1:] # ignore NO_FAILURE class 0
            best_failure_idx = int(np.argmax(failure_class_probs)) + 1
            failure_type = FAILURE_TYPE_MAP.get(best_failure_idx, "UNKNOWN_FAILURE")
            confidence = round(float(failure_prob), 4)

        return {
            "failure_probability": failure_prob,
            "failure_prediction": failure_prediction,
            "failure_type": failure_type,
            "confidence": confidence,
            "model_version": self.model_version
        }
