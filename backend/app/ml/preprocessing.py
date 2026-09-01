import math
from typing import Dict, Any, List, Union
import numpy as np

# Canonical feature list expected by model
FEATURE_COLUMNS = [
    "air_temp",
    "process_temp",
    "rotational_speed",
    "torque",
    "tool_wear",
    "type_H",
    "type_L",
    "type_M",
    "temperature_difference",
    "power",
    "overstrain"
]

FAILURE_TYPE_MAP = {
    0: "NO_FAILURE",
    1: "TWF",
    2: "HDF",
    3: "PWF",
    4: "OSF",
    5: "RNF"
}

REVERSE_FAILURE_TYPE_MAP = {v: k for k, v in FAILURE_TYPE_MAP.items()}

def extract_features_from_dict(telemetry: Dict[str, Any]) -> np.ndarray:
    """
    Transforms a single sensor telemetry dictionary into an engineered feature vector.
    """
    air_temp = float(telemetry.get("air_temp", 298.0))
    process_temp = float(telemetry.get("process_temp", 308.0))
    rotational_speed = float(telemetry.get("rotational_speed", 1500.0))
    torque = float(telemetry.get("torque", 40.0))
    tool_wear = float(telemetry.get("tool_wear", 0.0))
    
    product_type = str(telemetry.get("product_type", "M")).upper()
    type_H = 1.0 if product_type == "H" else 0.0
    type_L = 1.0 if product_type == "L" else 0.0
    type_M = 1.0 if product_type == "M" else 0.0

    # Physics-based feature engineering
    temp_diff = round(process_temp - air_temp, 2)
    # Power P = (Torque * Speed * 2pi) / 60
    power = round((torque * rotational_speed * 2.0 * math.pi) / 60.0, 2)
    # Overstrain = Tool wear * Torque
    overstrain = round(tool_wear * torque, 2)

    features = [
        air_temp,
        process_temp,
        rotational_speed,
        torque,
        tool_wear,
        type_H,
        type_L,
        type_M,
        temp_diff,
        power,
        overstrain
    ]
    return np.array(features, dtype=np.float32).reshape(1, -1)
