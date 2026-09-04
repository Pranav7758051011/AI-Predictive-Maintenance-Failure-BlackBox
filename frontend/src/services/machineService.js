/**
 * INDUSENSE AI - Machine Fleet Service Adapter
 * Routed to Firebase & Realtime Cloud Firestore Layer
 */

import { firebaseMachineService } from '../firebase/machineService';

export const machineService = {
  async getMachines(params = {}) {
    return await firebaseMachineService.listMachines(params);
  },

  async listMachines(params = {}) {
    return await firebaseMachineService.listMachines(params);
  },

  async getMachineById(id) {
    return await firebaseMachineService.getMachineById(id);
  },

  async getMachine(id) {
    return await firebaseMachineService.getMachineById(id);
  },

  async createMachine(machineData) {
    return await firebaseMachineService.createMachine(machineData);
  },

  async updateMachine(id, updateData) {
    return await firebaseMachineService.updateMachine(id, updateData);
  },

  async deleteMachine(id) {
    return await firebaseMachineService.deleteMachine(id);
  },

  async assignEngineer(machineId, engineerId) {
    return await firebaseMachineService.assignEngineer(machineId, engineerId);
  },

  subscribeToFleet(callback) {
    return firebaseMachineService.subscribeToFleet(callback);
  }
};
