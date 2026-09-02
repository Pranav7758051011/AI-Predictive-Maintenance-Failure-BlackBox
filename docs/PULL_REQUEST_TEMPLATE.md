## 📌 Pull Request: Failure Black Box & Forensic Replay Subsystem

### 🎯 Overview
This Pull Request introduces the **Aviation-Grade Failure Black Box & Forensic Replay Subsystem** for the Industrial Predictive Maintenance Platform.

---

### ✨ Key Features Implemented

1. **Automatic Forensic Auto-Sealing**:
   - The instant XGBoost detects a failure condition (`failure_prediction == True`), the system auto-generates a sealed incident snapshot with code `BB-YYYY-XXXXXX`.
2. **24-Hour Telemetry Window Preservation**:
   - Preserves the preceding 24 hours of multi-channel sensor readings (Process Temp, Air Temp, RPM, Torque, Tool Wear, $\Delta T$) leading up to the exact moment of failure.
3. **Event Timeline Reconstruction**:
   - Chronologically tracks sequential events: `WINDOW_START` $\rightarrow$ `EARLIEST_TELEMETRY` $\rightarrow$ `HEALTH_DEGRADATION` $\rightarrow$ `FAILURE_DETECTED` $\rightarrow$ `BLACKBOX_SEALED`.
4. **Interactive Time-Series Replay Engine**:
   - Generates frame-by-frame synchronized playback (`GET /api/blackboxes/{id}/replay`) for the React frontend scrubber with play, pause, speed control, and live gauges.
5. **Tamper-Evident Audit Trail**:
   - Append-only compliance ledger tracking all evidence views and incident status transitions (`OPEN` $\rightarrow$ `UNDER_REVIEW` $\rightarrow$ `RESOLVED`).

---

### 🧪 Test & Quality Checklist
- [x] All 95 backend unit and integration tests passing (`pytest backend/tests -v`).
- [x] Full RBAC verification for Admin, Engineer, and Client roles.
- [x] Frontend production build passing (`npm run build`).
- [x] Black Box idempotency verified (duplicate failure triggers do not create redundant snapshots).
- [x] Documentation and schema specifications added.
