/**
 * INDUSENSE AI - Failure Black Box Service Adapter
 * Routed to Firebase & Realtime Firestore Layer
 */

import { firebaseBlackboxService } from '../firebase/blackboxService';

export const blackboxService = {
  async generateBlackBox(machine, prediction, telemetryHistory, triggerSource) {
    return await firebaseBlackboxService.generateBlackBox(machine, prediction, telemetryHistory, triggerSource);
  },

  async listBlackBoxes(params = {}) {
    return await firebaseBlackboxService.listBlackBoxes(params);
  },

  async getBlackBoxById(id) {
    return await firebaseBlackboxService.getBlackBoxById(id);
  },

  async getMachineBlackBoxes(machineId, params = {}) {
    return await firebaseBlackboxService.getMachineBlackBoxes(machineId, params);
  },

  async getBlackBoxReplay(id) {
    return await firebaseBlackboxService.getBlackBoxReplay(id);
  },

  async getAuditTrail(id) {
    return await firebaseBlackboxService.getAuditTrail(id);
  },

  async updateBlackBoxStatus(id, newStatus) {
    return await firebaseBlackboxService.updateBlackBoxStatus(id, newStatus);
  }
};
