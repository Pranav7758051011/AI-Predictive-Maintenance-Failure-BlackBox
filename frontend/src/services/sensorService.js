/**
 * INDUSENSE AI - Sensor Telemetry Service Adapter
 * Routed to Firebase & Realtime Firestore Layer
 */

import { firebaseSensorService } from '../firebase/sensorService';

export const sensorService = {
  async ingestTelemetry(machineId, telemetryData) {
    return await firebaseSensorService.ingestTelemetry(machineId, telemetryData);
  },

  async getLatestTelemetry(machineId) {
    return await firebaseSensorService.getLatestTelemetry(machineId);
  },

  async getTelemetryHistory(machineId, params = {}) {
    return await firebaseSensorService.getTelemetryHistory(machineId, params);
  },

  async getMachineMonitoring(machineId, hours = 24) {
    return await firebaseSensorService.getMachineMonitoring(machineId, hours);
  },

  async batchIngestTelemetry(machineId, readings = []) {
    return await firebaseSensorService.batchIngestTelemetry(machineId, readings);
  },

  subscribeToTelemetry(machineId, callback) {
    return firebaseSensorService.subscribeToTelemetry(machineId, callback);
  }
};
