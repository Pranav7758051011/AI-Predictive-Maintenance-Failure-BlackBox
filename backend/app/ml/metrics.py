from typing import Dict, Any, List, Tuple
import numpy as np

def calculate_confusion_matrix(y_true: np.ndarray, y_pred: np.ndarray, num_classes: int = 2) -> np.ndarray:
    """Computes confusion matrix for binary or multiclass classifications."""
    cm = np.zeros((num_classes, num_classes), dtype=int)
    for t, p in zip(y_true, y_pred):
        if 0 <= t < num_classes and 0 <= p < num_classes:
            cm[int(t), int(p)] += 1
    return cm

def calculate_binary_metrics(y_true: np.ndarray, y_pred: np.ndarray, y_prob: np.ndarray = None) -> Dict[str, Any]:
    """Calculates accuracy, precision, recall, F1, and confusion matrix for binary classification."""
    y_true = np.asarray(y_true).astype(int)
    y_pred = np.asarray(y_pred).astype(int)

    tp = int(np.sum((y_true == 1) & (y_pred == 1)))
    fp = int(np.sum((y_true == 0) & (y_pred == 1)))
    tn = int(np.sum((y_true == 0) & (y_pred == 0)))
    fn = int(np.sum((y_true == 1) & (y_pred == 0)))

    total = len(y_true)
    accuracy = (tp + tn) / total if total > 0 else 0.0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    # ROC AUC calculation (Mann-Whitney U statistic)
    roc_auc = 0.0
    if y_prob is not None and (tp + fn) > 0 and (tn + fp) > 0:
        pos_probs = y_prob[y_true == 1]
        neg_probs = y_prob[y_true == 0]
        # Rank comparison
        all_pairs = len(pos_probs) * len(neg_probs)
        if all_pairs > 0:
            concordant = np.sum(pos_probs[:, None] > neg_probs[None, :])
            ties = 0.5 * np.sum(pos_probs[:, None] == neg_probs[None, :])
            roc_auc = float((concordant + ties) / all_pairs)

    return {
        "accuracy": round(float(accuracy), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1_score": round(float(f1), 4),
        "roc_auc": round(float(roc_auc), 4),
        "confusion_matrix": {
            "true_negative": tn,
            "false_positive": fp,
            "false_negative": fn,
            "true_positive": tp
        }
    }

def calculate_multiclass_metrics(y_true: np.ndarray, y_pred: np.ndarray, class_names: List[str]) -> Dict[str, Any]:
    """Calculates macro/weighted precision, recall, F1, and per-class reports for multiclass classification."""
    y_true = np.asarray(y_true).astype(int)
    y_pred = np.asarray(y_pred).astype(int)
    num_classes = len(class_names)
    cm = calculate_confusion_matrix(y_true, y_pred, num_classes)

    class_report = {}
    f1_list = []
    precision_list = []
    recall_list = []

    for idx, cname in enumerate(class_names):
        tp = int(cm[idx, idx])
        fp = int(np.sum(cm[:, idx]) - tp)
        fn = int(np.sum(cm[idx, :]) - tp)
        support = int(np.sum(cm[idx, :]))

        prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0

        if support > 0:
            precision_list.append(prec)
            recall_list.append(rec)
            f1_list.append(f1)

        class_report[cname] = {
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1_score": round(float(f1), 4),
            "support": support
        }

    macro_prec = float(np.mean(precision_list)) if precision_list else 0.0
    macro_rec = float(np.mean(recall_list)) if recall_list else 0.0
    macro_f1 = float(np.mean(f1_list)) if f1_list else 0.0

    return {
        "macro_precision": round(macro_prec, 4),
        "macro_recall": round(macro_rec, 4),
        "macro_f1": round(macro_f1, 4),
        "class_report": class_report,
        "confusion_matrix": cm.tolist()
    }
