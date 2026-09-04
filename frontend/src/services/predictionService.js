/**
 * INDUSENSE AI - High-Performance Real-Time Prediction Service
 * Powered by Client-Side XGBoost Physics Inference Engine with Automatic Black Box Capture.
 */

import { runMLInference } from '../ml/mlInferenceEngine';
import { firebaseMachineService } from '../firebase/machineService';
import { firebaseSensorService } from '../firebase/sensorService';
import { firebaseBlackboxService } from '../firebase/blackboxService';
import { localStore } from '../firebase/config';

export const predictionService = {
  /**
   * Runs 0ms ML inference against custom/simulated telemetry input.
   */
  async predictFromTelemetry(machineId, telemetryData, threshold = 0.50) {
    const machine = await firebaseMachineService.getMachineById(machineId);
    const telemetryWithProductType = {
      ...telemetryData,
      product_type: telemetryData.product_type || machine?.product_type || 'M'
    };

    // 1. Run 0ms In-Browser ML Decision Engine
    const prediction = runMLInference(telemetryWithProductType, threshold);
    prediction.machine_id = machineId;
    prediction.id = `pred-${Date.now()}`;

    // 2. Update Machine Health, Status, and RUL
    if (machine) {
      const computedStatus =
        prediction.health_score < 45 || prediction.failure_prediction ? 'CRITICAL' :
        prediction.health_score < 70 ? 'WARNING' : 'HEALTHY';

      await firebaseMachineService.updateMachine(machineId, {
        current_health_score: prediction.health_score,
        current_rul_hours: prediction.rul_hours,
        status: computedStatus
      });
    }

    // 3. Ingest Telemetry record to keep history live
    await firebaseSensorService.ingestTelemetry(machineId, telemetryWithProductType);

    // 4. Automatic Failure Black Box Trigger
    if (prediction.failure_prediction) {
      try {
        const historyRes = await firebaseSensorService.getTelemetryHistory(machineId, { page_size: 20 });
        const bb = await firebaseBlackboxService.generateBlackBox(
          machine || { id: machineId, name: 'Industrial Equipment', serial_number: machineId },
          prediction,
          historyRes.items || []
        );
        prediction.blackbox_id = bb.id;
        prediction.blackbox_code = bb.blackbox_code;
      } catch (err) {
        console.warn('Auto blackbox capture notice:', err);
      }
    }

    // 5. Store Prediction in Realtime History
    const prevPreds = localStore.getCollection(`preds_${machineId}`);
    localStore.setCollection(`preds_${machineId}`, [prediction, ...prevPreds.slice(0, 49)]);

    return prediction;
  },

  /**
   * Runs ML inference against the latest sensor reading stored for a machine.
   */
  async predictFromLatest(machineId, threshold = 0.50) {
    const latest = await firebaseSensorService.getLatestTelemetry(machineId);
    return await this.predictFromTelemetry(machineId, latest, threshold);
  },

  /**
   * Lists historical predictions.
   */
  async listPredictions(params = {}) {
    let all = [];
    if (params.machine_id) {
      all = localStore.getCollection(`preds_${params.machine_id}`);
    } else {
      const machines = await firebaseMachineService.listMachines();
      for (const m of (machines.items || [])) {
        const list = localStore.getCollection(`preds_${m.id}`);
        all.push(...list);
      }
    }

    if (params.failure_only) {
      all = all.filter(p => p.failure_prediction);
    }

    const pageSize = Number(params.page_size) || 20;
    const page = Number(params.page) || 1;
    const startIdx = (page - 1) * pageSize;

    return {
      items: all.slice(startIdx, startIdx + pageSize),
      total: all.length,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(all.length / pageSize) || 1
    };
  },

  /**
   * Retrieves single prediction record.
   */
  async getPredictionById(predictionId) {
    const all = await this.listPredictions({ page_size: 100 });
    return (all.items || []).find(p => p.id === predictionId) || null;
  },

  /**
   * Retrieves prediction history for a specific machine.
   */
  async getMachinePredictions(machineId, params = {}) {
    return await this.listPredictions({ ...params, machine_id: machineId });
  },

  /**
   * Retrieves authoritative machine health status.
   */
  async getMachineHealth(machineId) {
    const machine = await firebaseMachineService.getMachineById(machineId);
    const latest = await firebaseSensorService.getLatestTelemetry(machineId);
    const pred = runMLInference(latest);

    return {
      machine_id: machineId,
      health_score: machine?.current_health_score !== undefined ? machine.current_health_score : pred.health_score,
      health_status: pred.health_status,
      failure_probability: pred.failure_probability,
      failure_prediction: pred.failure_prediction,
      failure_type: pred.failure_type,
      rul_hours: machine?.current_rul_hours || pred.rul_hours,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Retrieves risk evaluation level for a machine.
   */
  async getMachineRisk(machineId) {
    return await this.getMachineHealth(machineId);
  }
};
