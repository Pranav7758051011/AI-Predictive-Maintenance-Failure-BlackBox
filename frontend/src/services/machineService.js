import { apiRequest } from './api';

export const machineService = {
  async getMachines(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);
    if (params.status) query.append('status', params.status);
    if (params.product_type) query.append('product_type', params.product_type);
    if (params.assigned_engineer_id) query.append('assigned_engineer_id', params.assigned_engineer_id);

    const queryString = query.toString();
    const endpoint = `/api/machines${queryString ? `?${queryString}` : ''}`;
    return await apiRequest(endpoint, { method: 'GET' });
  },

  async getMachineById(machineId) {
    return await apiRequest(`/api/machines/${machineId}`, { method: 'GET' });
  },

  async createMachine(machineData) {
    return await apiRequest('/api/machines', {
      method: 'POST',
      body: machineData
    });
  },

  async updateMachine(machineId, machineData) {
    return await apiRequest(`/api/machines/${machineId}`, {
      method: 'PUT',
      body: machineData
    });
  },

  async deleteMachine(machineId) {
    return await apiRequest(`/api/machines/${machineId}`, {
      method: 'DELETE'
    });
  },

  async assignEngineer(machineId, engineerId) {
    return await apiRequest(`/api/machines/${machineId}/assign`, {
      method: 'POST',
      body: { engineer_id: engineerId }
    });
  }
};
