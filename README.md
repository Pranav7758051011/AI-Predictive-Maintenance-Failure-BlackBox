# AI-Powered Predictive Maintenance with Failure Black Box

[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/downloads/)
[![Flask 3.0](https://img.shields.io/badge/framework-Flask%203.0-green.svg)](https://flask.palletsprojects.com/)
[![MongoDB](https://img.shields.io/badge/database-MongoDB%20%2B%20PyMongo-brightgreen.svg)](https://www.mongodb.com/)
[![XGBoost](https://img.shields.io/badge/ML-XGBoost-orange.svg)](https://xgboost.readthedocs.io/)
[![Tests](https://img.shields.io/badge/tests-95%20passing%20(100%25)-success.svg)](backend/tests/)

An enterprise-grade Industrial AI platform for smart machinery condition monitoring, dual-stage failure detection, health scoring, and **immutable Failure Black Box incident capture with chronological time-series replay**.

---

## 1. What is the Failure Black Box?

Inspired by aviation flight recorders (flight black boxes), the **Failure Black Box** is the core differentiating feature of this platform. When an industrial asset experiences an imminent or active breakdown detected by machine learning inference (`failure_prediction == True`), the platform automatically triggers an immutable incident capture process.

### Why is it different from a normal prediction record?

| Feature | Standard ML Prediction Record | Failure Black Box Incident |
| :--- | :--- | :--- |
| **Purpose** | Point-in-time classification | Comprehensive forensic evidence preservation |
| **Data Scope** | Single telemetry snapshot | Full **24-hour historical telemetry window** + prediction trajectory |
| **Machine State** | Current foreign reference | **Frozen machine snapshot** (serial, name, type, location, assigned engineer) |
| **Event Timeline** | None | Chronologically reconstructed sequence of degradation milestones |
| **Immutability** | Can be overwritten or purged | **Strictly immutable evidence** with unique code (e.g., `BB-2026-000001`) |
| **Playback** | Not supported | **Time-Series Replay API** for frontend playback and root investigation |
| **Audit Trail** | None | Full append-only audit trail (`CREATED`, `VIEWED`, `REPLAYED`, `STATUS_CHANGED`) |

---

## 2. Target Architecture & Flow

```text
       Sensor Telemetry (Time-Series)
                     ↓
       ML Service (Stage 1: XGBoost Binary Classifier)
                     ↓
              Failure Detected?
              ├── NO  → Update Machine Health Score (0–100)
              └── YES ↓
       BlackBoxService (Automatic Incident Trigger)
              ├── 1. Retrieve previous 24h telemetry window
              ├── 2. Retrieve prediction degradation trajectory
              ├── 3. Freeze Machine configuration snapshot
              ├── 4. Construct chronological Event Timeline
              ├── 5. Generate unique code (e.g. BB-2026-000001)
              ├── 6. Store immutable document in 'failure_blackboxes'
              ├── 7. Append audit event to 'audit_logs'
              └── 8. Transition Machine status to 'CRITICAL'
                     ↓
       Chronological Failure Replay API (/replay)
```

---

## 3. How the 24-Hour Telemetry Capture Works

When a failure is detected at timestamp $T_{\text{failure}}$:
1. **Time Window**: An indexed query retrieves all sensor records where:
   $$\text{machine\_id} = \text{machine\_id} \quad \text{AND} \quad T_{\text{failure}} - 24\,\text{hours} \le \text{timestamp} \le T_{\text{failure}}$$
2. **Honest Data Availability**:
   - If a machine has 24 hours of history, `requested_duration_hours = 24` and `available_duration_hours = 24.0`.
   - If only 8 hours of history exist, `available_duration_hours = 8.0`. **Missing historical data is never fabricated.**
3. **Telemetry Snapshot**: Each frame preserves raw sensor values (`air_temp`, `process_temp`, `rotational_speed`, `torque`, `tool_wear`) and derived physics indicators ($\Delta T$, Mechanical Power $P$).

---

## 4. Black Box Document Structure

Stored in the `failure_blackboxes` collection:

```json
{
  "_id": "6a971f05f822ad8090494018",
  "blackbox_code": "BB-2026-000001",
  "machine_id": "6a971f05f822ad8090494013",
  "trigger_prediction_id": "6a971f05f822ad8090494017",
  "trigger_source": "AUTOMATIC_ML_TRIGGER",
  "failure_timestamp": "2026-09-01T18:52:53.481000Z",
  "failure_summary": {
    "failure_prediction": true,
    "failure_probability": 0.9511,
    "failure_type": "OSF",
    "health_score": 0.0,
    "confidence": 0.9511,
    "model_version": "failure-model-v1.0"
  },
  "machine_snapshot": {
    "id": "6a971f05f822ad8090494013",
    "serial_number": "TURBINE-BB-999",
    "name": "Heavy Industrial Turbine 999",
    "product_type": "H",
    "location": "Sector 7G",
    "status": "HEALTHY",
    "assigned_engineer_id": "6a971f05f822ad8090494010"
  },
  "telemetry_window": {
    "requested_duration_hours": 24,
    "available_duration_hours": 12.0,
    "telemetry_samples_count": 3,
    "predictions_count": 1
  },
  "telemetry_history": [ ... ],
  "prediction_history": [ ... ],
  "event_timeline": [
    {
      "timestamp": "2026-08-31T18:52:53.481000Z",
      "event_type": "WINDOW_START",
      "description": "24-hour Black Box evidence capture window opened.",
      "source": "BLACKBOX_SYSTEM"
    },
    {
      "timestamp": "2026-09-01T18:52:53.481000Z",
      "event_type": "FAILURE_DETECTED",
      "description": "CRITICAL: ML model (failure-model-v1.0) detected OSF failure with 95.1% probability.",
      "source": "ML_SERVICE"
    },
    {
      "timestamp": "2026-09-01T18:52:53.485000Z",
      "event_type": "BLACKBOX_SEALED",
      "description": "Failure Black Box incident snapshot sealed and preserved immutably.",
      "source": "BLACKBOX_SYSTEM"
    }
  ],
  "incident_status": "OPEN",
  "created_at": "2026-09-01T18:52:53.485000Z"
}
```

---

## 5. Audit Trail & Immutability

All critical events are recorded in the append-only `audit_logs` collection:
- `BLACKBOX_CREATED`: Recorded automatically on failure trigger (`actor_role: "SYSTEM"` or user role).
- `BLACKBOX_VIEWED`: Recorded every time an operator accesses the incident details.
- `BLACKBOX_REPLAYED`: Recorded when time-series replay frames are fetched.
- `BLACKBOX_STATUS_CHANGED`: Recorded when an incident status transitions (`OPEN` $\to$ `UNDER_REVIEW` $\to$ `RESOLVED`).

*All sensor, prediction, machine, and timeline evidence inside the Black Box remains strictly immutable.*

---

## 6. Failure Replay API

Frontend clients can consume the `/replay` endpoint to visually reconstruct the incident:

```http
GET /api/blackboxes/{blackbox_id}/replay
Authorization: Bearer <access_token>
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "blackbox_code": "BB-2026-000001",
    "machine_id": "6a971f05f822ad8090494013",
    "failure_timestamp": "2026-09-01T18:52:53.481000Z",
    "failure_type": "OSF",
    "total_frames": 3,
    "frames": [
      {
        "timestamp": "2026-09-01T06:52:53.479000Z",
        "telemetry": {
          "air_temp": 298.5,
          "process_temp": 308.2,
          "rotational_speed": 1520.0,
          "torque": 39.5,
          "tool_wear": 45.0,
          "product_type": "H",
          "temperature_difference": 9.7,
          "power": 6287.3
        },
        "prediction": null
      },
      {
        "timestamp": "2026-09-01T18:52:53.481000Z",
        "telemetry": {
          "air_temp": 298.0,
          "process_temp": 313.0,
          "rotational_speed": 1250.0,
          "torque": 68.0,
          "tool_wear": 215.0,
          "product_type": "H",
          "temperature_difference": 15.0,
          "power": 8901.2
        },
        "prediction": {
          "failure_probability": 0.9511,
          "failure_prediction": true,
          "failure_type": "OSF",
          "health_score": 0.0
        }
      }
    ]
  }
}
```

---

## 7. Role-Based Access Control (RBAC)

| Role | View Black Boxes | View Replay | View Audit Trail | Manual Incident Generation | Lifecycle Status Updates |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **ADMIN** | All Machines | All Machines | All Machines | Yes | Yes |
| **ENGINEER** | Assigned Machines | Assigned Machines | Assigned Machines | Assigned Machines | Assigned Machines |
| **VIEWER** | Assigned/Visible | Assigned/Visible | Assigned/Visible | No (403) | No (403) |

---

## 8. Complete API Reference

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/blackboxes/generate` | Manually capture Black Box from prediction | Admin, Assigned Engineer |
| `GET` | `/api/blackboxes` | List Black Box incidents (paginated & filtered) | Authenticated |
| `GET` | `/api/blackboxes/{id}` | Get full incident snapshot by database ID | Authenticated |
| `GET` | `/api/blackboxes/code/{code}` | Get incident snapshot by code (`BB-2026-000001`) | Authenticated |
| `GET` | `/api/machines/{id}/blackboxes` | Get incidents for a specific machine | Authenticated |
| `GET` | `/api/blackboxes/{id}/replay` | Get chronological replay frames | Authenticated |
| `GET` | `/api/blackboxes/{id}/audit` | Get immutable audit trail for incident | Authenticated |
| `PATCH`| `/api/blackboxes/{id}/status` | Update incident lifecycle status | Admin, Assigned Engineer |

---

## 9. Scientific Integrity & Project Boundaries

- **No Fabricated Root-Causes**: The platform presents preserved telemetry, predictions, and timelines. It does not output speculative text explanations without validated SHAP/explainability models.
- **No Fabricated Maintenance Instructions**: The Black Box flags incidents as requiring engineering review without generating unauthorized fake repair recommendations.
- **No Fabricated RUL**: `current_rul_hours` remains null until a scientifically validated degradation model is integrated.
- **Strict Idempotency**: Multiple generation calls for the same prediction ID return the existing Black Box without duplicating incident artifacts.

---

## 10. Running Tests & Verification

```bash
# Run full automated test suite (95 tests)
python -m pytest backend/tests -v

# Run Phase 5 end-to-end verification script
python backend/tests/verify_phase5.py
```
