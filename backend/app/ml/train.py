import os
import sys
import json
import math
from datetime import datetime, timezone
from typing import Dict, Any, Tuple

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import pandas as pd
import numpy as np
import xgboost as xgb

from app.ml.preprocessing import (
    FEATURE_COLUMNS,
    FAILURE_TYPE_MAP,
    REVERSE_FAILURE_TYPE_MAP,
    extract_features_from_dict
)
from app.ml.metrics import (
    calculate_binary_metrics,
    calculate_multiclass_metrics
)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

def load_and_preprocess_dataset(csv_path: str) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Loads and preprocesses the AI4I 2020 Predictive Maintenance dataset.
    Returns: (X, y_binary, y_multiclass)
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset CSV not found at: {csv_path}")

    df = pd.read_csv(csv_path)

    # Validate required columns
    req_cols = [
        "Type", "Air temperature", "Process temperature",
        "Rotational speed", "Torque", "Tool wear", "Machine failure"
    ]
    for col in req_cols:
        if col not in df.columns:
            raise ValueError(f"Missing required column in dataset: '{col}'")

    X_list = []
    y_binary = df["Machine failure"].values.astype(int)
    y_multi_list = []

    for idx, row in df.iterrows():
        # Feature extraction
        telemetry_dict = {
            "air_temp": float(row["Air temperature"]),
            "process_temp": float(row["Process temperature"]),
            "rotational_speed": float(row["Rotational speed"]),
            "torque": float(row["Torque"]),
            "tool_wear": float(row["Tool wear"]),
            "product_type": str(row["Type"])
        }
        feat_vec = extract_features_from_dict(telemetry_dict)
        X_list.append(feat_vec.flatten())

        # Failure type classification target
        if row["Machine failure"] == 0:
            y_multi_list.append(0)  # NO_FAILURE
        elif "HDF" in row and row["HDF"] == 1:
            y_multi_list.append(2)  # Heat Dissipation Failure
        elif "PWF" in row and row["PWF"] == 1:
            y_multi_list.append(3)  # Power Failure
        elif "OSF" in row and row["OSF"] == 1:
            y_multi_list.append(4)  # Overstrain Failure
        elif "TWF" in row and row["TWF"] == 1:
            y_multi_list.append(1)  # Tool Wear Failure
        elif "RNF" in row and row["RNF"] == 1:
            y_multi_list.append(5)  # Random Failure
        else:
            y_multi_list.append(1)  # Fallback to general failure

    X = np.array(X_list, dtype=np.float32)
    y_multi = np.array(y_multi_list, dtype=int)

    return X, y_binary, y_multi

def stratified_split(X: np.ndarray, y: np.ndarray, y_aux: np.ndarray, test_ratio: float = 0.2, random_state: int = 42):
    """Performs a reproducible stratified train/test split on imbalanced binary targets."""
    np.random.seed(random_state)
    pos_indices = np.where(y == 1)[0]
    neg_indices = np.where(y == 0)[0]

    np.random.shuffle(pos_indices)
    np.random.shuffle(neg_indices)

    pos_test_len = int(len(pos_indices) * test_ratio)
    neg_test_len = int(len(neg_indices) * test_ratio)

    test_indices = np.concatenate([pos_indices[:pos_test_len], neg_indices[:neg_test_len]])
    train_indices = np.concatenate([pos_indices[pos_test_len:], neg_indices[neg_test_len:]])

    np.random.shuffle(test_indices)
    np.random.shuffle(train_indices)

    return (
        X[train_indices], X[test_indices],
        y[train_indices], y[test_indices],
        y_aux[train_indices], y_aux[test_indices]
    )

def train_and_evaluate(csv_path: str = None, save_models: bool = True) -> Dict[str, Any]:
    """
    Trains Stage 1 (Binary Failure Prediction) & Stage 2 (Multiclass Failure Type) models.
    Evaluates test set performance and saves model artifacts.
    """
    if not csv_path:
        csv_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "predictive_maintenance.csv")

    print("=" * 70)
    print("AI-PREDICTIVE-MAINTENANCE: MODEL TRAINING & EVALUATION PIPELINE")
    print("=" * 70)
    print(f"Loading dataset from: {os.path.abspath(csv_path)}")

    X, y_binary, y_multi = load_and_preprocess_dataset(csv_path)
    total_samples = len(X)
    pos_samples = int(np.sum(y_binary))
    neg_samples = total_samples - pos_samples
    imbalance_ratio = neg_samples / pos_samples if pos_samples > 0 else 1.0

    print(f"Total Dataset Size: {total_samples} samples")
    print(f"Class Distribution: {neg_samples} Normal (0), {pos_samples} Failures (1) -> Imbalance Ratio: {imbalance_ratio:.2f}:1")

    # Split
    X_train, X_test, y_train, y_test, y_m_train, y_m_test = stratified_split(
        X, y_binary, y_multi, test_ratio=0.2, random_state=42
    )

    print(f"Train Set: {len(X_train)} samples ({int(np.sum(y_train))} failures)")
    print(f"Test Set:  {len(X_test)} samples ({int(np.sum(y_test))} failures)")

    # 1. Train Stage 1: Binary Machine Failure Model
    print("\n--- Training Stage 1: Binary Failure Predictor (XGBoost) ---")
    dtrain_bin = xgb.DMatrix(X_train, label=y_train, feature_names=FEATURE_COLUMNS)
    dtest_bin = xgb.DMatrix(X_test, label=y_test, feature_names=FEATURE_COLUMNS)

    params_binary = {
        "objective": "binary:logistic",
        "eval_metric": "auc",
        "max_depth": 4,
        "eta": 0.08,
        "scale_pos_weight": float(imbalance_ratio), # Handle class imbalance
        "subsample": 0.85,
        "colsample_bytree": 0.85,
        "seed": 42
    }

    evals = [(dtrain_bin, "train"), (dtest_bin, "test")]
    binary_booster = xgb.train(
        params_binary,
        dtrain_bin,
        num_boost_round=120,
        evals=evals,
        verbose_eval=False
    )

    # Stage 1 Evaluation
    test_probs = binary_booster.predict(dtest_bin)
    threshold = 0.50
    test_preds = (test_probs >= threshold).astype(int)

    bin_metrics = calculate_binary_metrics(y_test, test_preds, test_probs)
    print(f"\n[Stage 1 Binary Evaluation Results (Threshold = {threshold})]:")
    print(f"  Accuracy:  {bin_metrics['accuracy'] * 100:.2f}%")
    print(f"  Precision: {bin_metrics['precision'] * 100:.2f}%")
    print(f"  Recall:    {bin_metrics['recall'] * 100:.2f}% (Failure Capture)")
    print(f"  F1-Score:  {bin_metrics['f1_score']:.4f}")
    print(f"  ROC-AUC:   {bin_metrics['roc_auc']:.4f}")
    print(f"  Confusion Matrix: {bin_metrics['confusion_matrix']}")

    # 2. Train Stage 2: Multiclass Failure Type Classifier
    print("\n--- Training Stage 2: Multiclass Failure Type Classifier (XGBoost) ---")
    dtrain_multi = xgb.DMatrix(X_train, label=y_m_train, feature_names=FEATURE_COLUMNS)
    dtest_multi = xgb.DMatrix(X_test, label=y_m_test, feature_names=FEATURE_COLUMNS)

    params_multi = {
        "objective": "multi:softprob",
        "num_class": 6,
        "eval_metric": "mlogloss",
        "max_depth": 4,
        "eta": 0.08,
        "subsample": 0.85,
        "seed": 42
    }

    multi_booster = xgb.train(
        params_multi,
        dtrain_multi,
        num_boost_round=120,
        verbose_eval=False
    )

    # Stage 2 Evaluation
    multi_probs = multi_booster.predict(dtest_multi)
    multi_preds = np.argmax(multi_probs, axis=1)

    class_names = [FAILURE_TYPE_MAP[i] for i in range(6)]
    multi_metrics = calculate_multiclass_metrics(y_m_test, multi_preds, class_names)
    print("\n[Stage 2 Multiclass Evaluation Results]:")
    print(f"  Macro Precision: {multi_metrics['macro_precision']:.4f}")
    print(f"  Macro Recall:    {multi_metrics['macro_recall']:.4f}")
    print(f"  Macro F1-Score:  {multi_metrics['macro_f1']:.4f}")
    print("  Class Breakdown:")
    for cname, stats in multi_metrics["class_report"].items():
        print(f"    - {cname:12}: Prec={stats['precision']:.2f}, Rec={stats['recall']:.2f}, F1={stats['f1_score']:.2f} (Support={stats['support']})")

    # Save Artifacts
    if save_models:
        os.makedirs(MODELS_DIR, exist_ok=True)
        bin_model_path = os.path.join(MODELS_DIR, "failure_model.json")
        multi_model_path = os.path.join(MODELS_DIR, "failure_type_model.json")
        meta_path = os.path.join(MODELS_DIR, "metadata.json")

        binary_booster.save_model(bin_model_path)
        multi_booster.save_model(multi_model_path)

        metadata = {
            "model_version": "failure-model-v1.0",
            "algorithm": "XGBoost Native Booster",
            "features": FEATURE_COLUMNS,
            "failure_types": FAILURE_TYPE_MAP,
            "failure_probability_threshold": threshold,
            "dataset_info": {
                "total_samples": total_samples,
                "train_samples": len(X_train),
                "test_samples": len(X_test),
                "normal_samples": neg_samples,
                "failure_samples": pos_samples,
                "imbalance_ratio": f"{imbalance_ratio:.2f}:1"
            },
            "evaluation_metrics": {
                "binary": bin_metrics,
                "multiclass": multi_metrics
            },
            "trained_at": datetime.now(timezone.utc).isoformat()
        }

        with open(meta_path, "w") as f:
            json.dump(metadata, f, indent=2)

        print(f"\n[Saved Model Artifacts successfully in '{os.path.abspath(MODELS_DIR)}']:")
        print(f"  - {bin_model_path}")
        print(f"  - {multi_model_path}")
        print(f"  - {meta_path}")

    print("=" * 70)
    print("MODEL TRAINING COMPLETED SUCCESSFULLY")
    print("=" * 70)

    return {
        "binary_metrics": bin_metrics,
        "multiclass_metrics": multi_metrics,
        "features": FEATURE_COLUMNS,
        "model_version": "failure-model-v1.0"
    }

if __name__ == "__main__":
    train_and_evaluate()
