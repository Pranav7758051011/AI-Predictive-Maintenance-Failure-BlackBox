/**
 * INDUSENSE AI - Firebase & Realtime Sensor Telemetry Service
 * Ingests multi-sensor IoT telemetry streams, computes physical derivatives, and provides live graph feeds.
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db, isFirebaseConfigured, localStore } from './config';
import { extractPhysicsFeatures } from '../ml/mlInferenceEngine';

const INITIAL_TELEMETRY = {
  '6a9acaf94948975b4633ae61': {
    air_temp: 298.1,
    process_temp: 308.6,
    rotational_speed: 1550,
    torque: 42.0,
    tool_wear: 20,
    temperature_difference: 10.5,
    power: 6817.26,
    overstrain: 840.0,
    product_type: 'M',
    timestamp: new Date().toISOString()
  },
  '6a9acaf94948975b4633ae63': {
    air_temp: 298.1,
    process_temp: 308.6,
    rotational_speed: 1550,
    torque: 42.0,
    tool_wear: 20,
    temperature_difference: 10.5,
    power: 6817.26,
    overstrain: 840.0,
    product_type: 'M',
    timestamp: new Date().toISOString()
  }
};

export const firebaseSensorService = {
  /**
   * Ingests a new sensor reading for a machine.
   */
  async ingestTelemetry(machineId, telemetryData) {
    const feat = extractPhysicsFeatures(telemetryData);
    const reading = {
      id: `tel-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      machine_id: machineId,
      ...feat,
      timestamp: telemetryData.timestamp || new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    // 1. Update Local Telemetry Store
    const allTelemetry = localStore.getCollection(`telemetry_${machineId}`);
    const updatedHistory = [reading, ...allTelemetry.slice(0, 99)];
    localStore.setCollection(`telemetry_${machineId}`, updatedHistory);
    localStore.setCollection(`latest_tel_${machineId}`, reading);

    // 2. Persist to Firestore if live project configured
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'telemetry', reading.id), reading);
      } catch (e) {
        // ignore
      }
    }

    return reading;
  },

  /**
   * Retrieves the most recent telemetry record for a machine.
   */
  async getLatestTelemetry(machineId) {
    const latest = localStore.getCollection(`latest_tel_${machineId}`);
    if (latest && latest.air_temp) return latest;

    const history = localStore.getCollection(`telemetry_${machineId}`);
    if (history && history.length > 0) return history[0];

    // Default nominal fallback
    const fallback = INITIAL_TELEMETRY[machineId] || {
      machine_id: machineId,
      air_temp: 298.1,
      process_temp: 308.6,
      rotational_speed: 1550,
      torque: 42.0,
      tool_wear: 20,
      temperature_difference: 10.5,
      power: 6817.26,
      overstrain: 840.0,
      product_type: 'M',
      timestamp: new Date().toISOString()
    };

    localStore.setCollection(`latest_tel_${machineId}`, fallback);
    return fallback;
  },

  /**
   * Retrieves historical telemetry records for a machine.
   */
  async getTelemetryHistory(machineId, params = {}) {
    let history = localStore.getCollection(`telemetry_${machineId}`);
    if (!history || history.length === 0) {
      // Seed initial 10-point curve
      const base = await this.getLatestTelemetry(machineId);
      const seeded = [];
      const now = Date.now();
      for (let i = 9; i >= 0; i--) {
        seeded.push({
          ...base,
          id: `seed-tel-${i}`,
          timestamp: new Date(now - i * 60000).toISOString(),
          tool_wear: Math.max(0, base.tool_wear - i * 0.5),
          air_temp: Number((base.air_temp + (Math.random() * 0.4 - 0.2)).toFixed(1)),
          process_temp: Number((base.process_temp + (Math.random() * 0.4 - 0.2)).toFixed(1)),
          rotational_speed: Math.round(base.rotational_speed + (Math.random() * 20 - 10)),
          torque: Number((base.torque + (Math.random() * 2 - 1)).toFixed(1))
        });
      }
      history = seeded;
      localStore.setCollection(`telemetry_${machineId}`, history);
    }

    const pageSize = Number(params.page_size) || 20;
    const page = Number(params.page) || 1;
    const startIdx = (page - 1) * pageSize;
    const items = history.slice(startIdx, startIdx + pageSize);

    return {
      items,
      total: history.length,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(history.length / pageSize) || 1
    };
  },

  /**
   * Retrieves monitoring telemetry dataset for charts.
   */
  async getMachineMonitoring(machineId, hours = 24) {
    const history = await this.getTelemetryHistory(machineId, { page_size: 50 });
    return {
      machine_id: machineId,
      time_window_hours: hours,
      telemetry: history.items || []
    };
  },

  /**
   * Bulk ingests multiple sensor readings.
   */
  async batchIngestTelemetry(machineId, readings = []) {
    const results = [];
    for (const r of readings) {
      const res = await this.ingestTelemetry(machineId, r);
      results.push(res);
    }
    return {
      items: results,
      total_ingested: results.length
    };
  },

  /**
   * Subscribes to live real-time sensor updates for a machine.
   */
  subscribeToTelemetry(machineId, callback) {
    return localStore.subscribe(`telemetry_${machineId}`, (list) => {
      callback(list || []);
    });
  }
};
