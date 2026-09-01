import { apiRequest } from './api';

export const sensorService = {
  async getLatestTelemetry(machineId) {
    return await apiRequest(`/api/machines/${machineId}/sensors/latest`, { method: 'GET' });
  },

  async getMonitoringData(machineId) {
    return await apiRequest(`/api/machines/${machineId}/monitoring`, { method: 'GET' });
  },

  async getTelemetryHistory(machineId, params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);
    if (params.start_time) query.append('start_time', params.start_time);
    if (params.end_time) query.append('end_time', params.end_time);

    const queryString = query.toString();
    const endpoint = `/api/machines/${machineId}/sensors${queryString ? `?${queryString}` : ''}`;
    return await apiRequest(endpoint, { method: 'GET' });
  },

  async ingestTelemetry(machineId, telemetryData) {
    return await apiRequest(`/api/machines/${machineId}/sensors`, {
      method: 'POST',
      body: telemetryData
    });
  },

  async ingestBatchTelemetry(machineId, readings) {
    return await apiRequest(`/api/machines/${machineId}/sensors/batch`, {
      method: 'POST',
      body: { readings }
    });
  }
};
