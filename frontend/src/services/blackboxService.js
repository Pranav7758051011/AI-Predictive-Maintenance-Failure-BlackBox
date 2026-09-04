/**
 * INDUSENSE AI - Failure Black Box Service Adapter
 * Routed to Firebase & Realtime Cloud Firestore Layer
 */

import { firebaseBlackboxService } from '../firebase/blackboxService';

export const blackboxService = {
  async generateBlackBox(machine, prediction, telemetryHistory, triggerSource) {
    return await firebaseBlackboxService.generateBlackBox(machine, prediction, telemetryHistory, triggerSource);
  },

  async simulateFailureBlackBox(machineId) {
    return await firebaseBlackboxService.simulateFailureBlackBox(machineId);
  },

  async listBlackBoxes(params = {}) {
    return await firebaseBlackboxService.listBlackBoxes(params);
  },

  async getBlackBoxes(params = {}) {
    return await firebaseBlackboxService.listBlackBoxes(params);
  },

  async getBlackBoxById(id) {
    return await firebaseBlackboxService.getBlackBoxById(id);
  },

  async getBlackBox(id) {
    return await firebaseBlackboxService.getBlackBoxById(id);
  },

  async getMachineBlackBoxes(machineId, params = {}) {
    return await firebaseBlackboxService.getMachineBlackBoxes(machineId, params);
  },

  async getBlackBoxReplay(id) {
    return await firebaseBlackboxService.getBlackBoxReplay(id);
  },

  async getReplayFrames(id) {
    return await firebaseBlackboxService.getBlackBoxReplay(id);
  },

  async getAuditTrail(id) {
    return await firebaseBlackboxService.getAuditTrail(id);
  },

  async updateBlackBoxStatus(id, newStatus) {
    return await firebaseBlackboxService.updateBlackBoxStatus(id, newStatus);
  },

  async updateStatus(id, newStatus) {
    return await firebaseBlackboxService.updateBlackBoxStatus(id, newStatus);
  }
};
