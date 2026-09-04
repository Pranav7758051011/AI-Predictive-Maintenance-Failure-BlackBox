import { apiRequest } from './api';

export const blackboxService = {
  /**
   * Manually captures a Failure Black Box incident snapshot for a prediction.
   */
  async generateBlackBox(predictionId) {
    return await apiRequest('/api/blackboxes/generate', {
      method: 'POST',
      body: { prediction_id: predictionId }
    });
  },

  /**
   * 1-Click failure simulation and 24-hour Failure Black Box generation.
   */
  async simulateFailureBlackBox(machineId = null) {
    return await apiRequest('/api/blackboxes/simulate', {
      method: 'POST',
      body: machineId ? { machine_id: machineId } : {}
    });
  },

  /**
   * Lists paginated Failure Black Box incident records with filters.
   */
  async listBlackBoxes(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);
    if (params.machine_id) query.append('machine_id', params.machine_id);
    if (params.failure_type) query.append('failure_type', params.failure_type);
    if (params.incident_status) query.append('incident_status', params.incident_status);
    if (params.start_time) query.append('start_time', params.start_time);
    if (params.end_time) query.append('end_time', params.end_time);

    const queryString = query.toString();
    const endpoint = `/api/blackboxes${queryString ? `?${queryString}` : ''}`;
    return await apiRequest(endpoint, { method: 'GET' });
  },

  /**
   * Retrieves full immutable snapshot of a Black Box by database ID.
   */
  async getBlackBoxById(blackboxId) {
    return await apiRequest(`/api/blackboxes/${blackboxId}`, { method: 'GET' });
  },

  /**
   * Retrieves full snapshot using human-readable code (e.g. 'BB-2026-000001').
   */
  async getBlackBoxByCode(blackboxCode) {
    return await apiRequest(`/api/blackboxes/code/${blackboxCode}`, { method: 'GET' });
  },

  /**
   * Retrieves all Black Box incidents for a specific machine.
   */
  async getMachineBlackBoxes(machineId, params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);

    const queryString = query.toString();
    const endpoint = `/api/machines/${machineId}/blackboxes${queryString ? `?${queryString}` : ''}`;
    return await apiRequest(endpoint, { method: 'GET' });
  },

  /**
   * Retrieves chronological time-series frames (telemetry + predictions) for incident playback.
   */
  async getReplayFrames(blackboxIdOrCode) {
    return await apiRequest(`/api/blackboxes/${blackboxIdOrCode}/replay`, { method: 'GET' });
  },

  /**
   * Retrieves immutable audit trail logs for a Black Box incident.
   */
  async getAuditTrail(blackboxId, params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);

    const queryString = query.toString();
    const endpoint = `/api/blackboxes/${blackboxId}/audit${queryString ? `?${queryString}` : ''}`;
    return await apiRequest(endpoint, { method: 'GET' });
  },

  /**
   * Updates incident lifecycle status (OPEN, UNDER_REVIEW, RESOLVED).
   * All historical snapshot evidence remains strictly immutable!
   */
  async updateStatus(blackboxId, incidentStatus) {
    return await apiRequest(`/api/blackboxes/${blackboxId}/status`, {
      method: 'PATCH',
      body: { incident_status: incidentStatus }
    });
  }
};
