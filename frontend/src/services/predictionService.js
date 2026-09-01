import { apiRequest } from './api';

export const predictionService = {
  /**
   * Runs real XGBoost ML inference against latest telemetry stored for a machine.
   * Updates health score and automatically captures Failure Black Box on failure.
   */
  async predictFromLatest(machineId, threshold = null) {
    const payload = {};
    if (threshold !== null && threshold !== undefined) {
      payload.threshold = threshold;
    }
    return await apiRequest(`/api/machines/${machineId}/predictions`, {
      method: 'POST',
      body: payload
    });
  },

  /**
   * Runs real XGBoost ML inference against custom/simulated telemetry input.
   */
  async predictFromTelemetry(machineId, telemetryData, threshold = null) {
    const payload = {
      machine_id: machineId,
      telemetry: telemetryData
    };
    if (threshold !== null && threshold !== undefined) {
      payload.threshold = threshold;
    }
    return await apiRequest('/api/predictions', {
      method: 'POST',
      body: payload
    });
  },

  /**
   * Lists historical predictions with pagination and machine filters.
   */
  async listPredictions(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);
    if (params.machine_id) query.append('machine_id', params.machine_id);
    if (params.failure_only !== undefined) query.append('failure_only', params.failure_only);

    const queryString = query.toString();
    const endpoint = `/api/predictions${queryString ? `?${queryString}` : ''}`;
    return await apiRequest(endpoint, { method: 'GET' });
  },

  /**
   * Retrieves single prediction record by ID.
   */
  async getPredictionById(predictionId) {
    return await apiRequest(`/api/predictions/${predictionId}`, { method: 'GET' });
  },

  /**
   * Retrieves prediction history for a specific machine.
   */
  async getMachinePredictions(machineId, params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);

    const queryString = query.toString();
    const endpoint = `/api/machines/${machineId}/predictions${queryString ? `?${queryString}` : ''}`;
    return await apiRequest(endpoint, { method: 'GET' });
  },

  /**
   * Retrieves authoritative machine health score and status from Flask backend.
   */
  async getMachineHealth(machineId) {
    return await apiRequest(`/api/machines/${machineId}/health`, { method: 'GET' });
  },

  /**
   * Retrieves risk evaluation level for a machine.
   */
  async getMachineRisk(machineId) {
    return await apiRequest(`/api/machines/${machineId}/risk`, { method: 'GET' });
  }
};
