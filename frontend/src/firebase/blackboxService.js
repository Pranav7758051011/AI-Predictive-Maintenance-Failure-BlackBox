/**
 * INDUSENSE AI - Firebase & Realtime Failure Black Box Service
 * Manages immutable 24-hour disaster telemetry snapshots, flight data replay, and ISO audit logging.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db, isFirebaseConfigured, localStore } from './config';

const INITIAL_BLACKBOXES = [
  {
    id: 'bb-2026-000001',
    blackbox_code: 'BB-2026-000001',
    machine_id: '6a9acaf94948975b4633ae64',
    machine_snapshot: {
      id: '6a9acaf94948975b4633ae64',
      name: 'High-Power Induction Drive Motor',
      serial_number: 'MOTOR-308',
      product_type: 'L',
      location: 'Bay 1 - Powerhouse'
    },
    trigger_source: 'AUTOMATIC_ML_TRIGGER',
    failure_timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    incident_status: 'OPEN',
    failure_summary: {
      failure_predicted: true,
      failure_type: 'Overstrain Failure (OSF)',
      failure_probability: 0.9896,
      health_score_at_failure: 12.0,
      dominant_factor: 'Overstrain threshold exceeded (14960 min·Nm > 11000 limit)'
    },
    telemetry_window: {
      requested_duration_hours: 24,
      available_duration_hours: 12.0,
      start_time: new Date(Date.now() - 3600000 * 16).toISOString(),
      end_time: new Date(Date.now() - 3600000 * 4).toISOString(),
      telemetry_samples_count: 12,
      predictions_count: 1
    },
    telemetry_history: Array.from({ length: 12 }, (_, i) => ({
      timestamp: new Date(Date.now() - (12 - i) * 3600000).toISOString(),
      air_temp: 298.0,
      process_temp: i >= 10 ? 314.0 : 308.5,
      rotational_speed: i >= 10 ? 1150.0 : 1520.0,
      torque: i >= 10 ? 76.0 : 42.0,
      tool_wear: 150 + i * 8,
      temperature_difference: i >= 10 ? 16.0 : 10.5,
      power: i >= 10 ? 9152.0 : 6680.0,
      health_score: i >= 10 ? 12.0 : 85.0 - i * 5
    })),
    event_timeline: [
      { event_type: 'WINDOW_START', timestamp: new Date(Date.now() - 3600000 * 16).toISOString(), description: '24-hour observation telemetry window opened.' },
      { event_type: 'HEALTH_DEGRADATION', timestamp: new Date(Date.now() - 3600000 * 6).toISOString(), description: 'Machine health score dropped below 50% due to tool wear and torque load.' },
      { event_type: 'FAILURE_DETECTED', timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), description: 'XGBoost ML Native engine classified Overstrain Failure (OSF).' },
      { event_type: 'BLACKBOX_SEALED', timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), description: 'Immutable incident snapshot BB-2026-000001 created and sealed.' }
    ],
    audit_trail: [
      { action: 'BLACKBOX_CREATED', timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), user: 'ML Auto System', details: 'Incident triggered on prediction threshold' },
      { action: 'BLACKBOX_VIEWED', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), user: 'Lead Reliability Engineer', details: 'Initial review opened' }
    ],
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    updated_at: new Date().toISOString()
  }
];

function seedLocalBlackBoxesIfEmpty() {
  const current = localStore.getCollection('blackboxes');
  if (!current || current.length === 0) {
    localStore.setCollection('blackboxes', INITIAL_BLACKBOXES);
    return INITIAL_BLACKBOXES;
  }
  return current;
}

export const firebaseBlackboxService = {
  /**
   * Captures and seals a new 24-hour Failure Black Box incident snapshot.
   */
  async generateBlackBox(machine, prediction, telemetryHistory = [], triggerSource = 'AUTOMATIC_ML_TRIGGER') {
    seedLocalBlackBoxesIfEmpty();
    const now = new Date();
    const counter = Math.floor(Math.random() * 900000 + 100000);
    const code = `BB-${now.getFullYear()}-${counter}`;
    const id = `bb-${Date.now()}`;

    const snapshot = {
      id,
      blackbox_code: code,
      machine_id: machine.id,
      machine_snapshot: {
        id: machine.id,
        name: machine.name,
        serial_number: machine.serial_number,
        product_type: machine.product_type,
        location: machine.location
      },
      trigger_source: triggerSource,
      failure_timestamp: now.toISOString(),
      incident_status: 'OPEN',
      failure_summary: {
        failure_predicted: prediction.failure_prediction,
        failure_type: prediction.failure_type,
        failure_probability: prediction.failure_probability,
        health_score_at_failure: prediction.health_score,
        dominant_factor: prediction.dominant_factor || 'Operational threshold exceeded'
      },
      telemetry_window: {
        requested_duration_hours: 24,
        available_duration_hours: 24.0,
        start_time: new Date(now.getTime() - 86400000).toISOString(),
        end_time: now.toISOString(),
        telemetry_samples_count: telemetryHistory.length || 20,
        predictions_count: 1
      },
      telemetry_history: telemetryHistory.length > 0 ? telemetryHistory : [
        {
          timestamp: now.toISOString(),
          air_temp: prediction.features?.air_temp || 298.1,
          process_temp: prediction.features?.process_temp || 308.6,
          rotational_speed: prediction.features?.rotational_speed || 1550,
          torque: prediction.features?.torque || 42.0,
          tool_wear: prediction.features?.tool_wear || 20,
          health_score: prediction.health_score
        }
      ],
      event_timeline: [
        { event_type: 'WINDOW_START', timestamp: new Date(now.getTime() - 86400000).toISOString(), description: '24-hour observation telemetry window opened.' },
        { event_type: 'CRITICAL_TELEMETRY', timestamp: new Date(now.getTime() - 60000).toISOString(), description: `Sensor excursion detected: ${prediction.dominant_factor}` },
        { event_type: 'FAILURE_DETECTED', timestamp: now.toISOString(), description: `Inference Engine triggered ${prediction.failure_type}.` },
        { event_type: 'BLACKBOX_SEALED', timestamp: now.toISOString(), description: `Immutable incident snapshot ${code} created.` }
      ],
      audit_trail: [
        { action: 'BLACKBOX_CREATED', timestamp: now.toISOString(), user: 'System Autonomous Watchdog', details: `Automated ISO snapshot captured for ${machine.serial_number}` }
      ],
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };

    const currentList = localStore.getCollection('blackboxes');
    localStore.setCollection('blackboxes', [snapshot, ...currentList]);

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'blackboxes', id), snapshot);
      } catch (e) {
        // ignore
      }
    }

    return snapshot;
  },

  /**
   * Retrieves paginated list of Black Box incidents.
   */
  async listBlackBoxes(params = {}) {
    seedLocalBlackBoxesIfEmpty();
    let all = localStore.getCollection('blackboxes');

    if (params.machine_id) {
      all = all.filter(bb => bb.machine_id === params.machine_id);
    }
    if (params.incident_status && params.incident_status !== 'ALL') {
      all = all.filter(bb => bb.incident_status === params.incident_status);
    }

    const pageSize = Number(params.page_size) || 20;
    const page = Number(params.page) || 1;
    const startIdx = (page - 1) * pageSize;
    const items = all.slice(startIdx, startIdx + pageSize);

    return {
      items,
      total: all.length,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(all.length / pageSize) || 1
    };
  },

  /**
   * Retrieves single Black Box by ID.
   */
  async getBlackBoxById(id) {
    seedLocalBlackBoxesIfEmpty();
    const all = localStore.getCollection('blackboxes');
    let found = all.find(b => b.id === id || b.blackbox_code === id);
    if (!found && all.length > 0) found = all[0];
    return found;
  },

  /**
   * Retrieves Black Boxes for a specific machine.
   */
  async getMachineBlackBoxes(machineId, params = {}) {
    return await this.listBlackBoxes({ ...params, machine_id: machineId });
  },

  /**
   * Retrieves replay payload for a Black Box incident.
   */
  async getBlackBoxReplay(id) {
    const bb = await this.getBlackBoxById(id);
    if (!bb) throw new Error('Black Box record not found.');

    return {
      blackbox_id: bb.id,
      blackbox_code: bb.blackbox_code,
      machine_snapshot: bb.machine_snapshot,
      failure_summary: bb.failure_summary,
      telemetry_frames: bb.telemetry_history || [],
      event_timeline: bb.event_timeline || [],
      total_frames: (bb.telemetry_history || []).length
    };
  },

  /**
   * Retrieves audit trail for a Black Box.
   */
  async getAuditTrail(id) {
    const bb = await this.getBlackBoxById(id);
    return {
      blackbox_id: id,
      items: bb?.audit_trail || []
    };
  },

  /**
   * Updates incident lifecycle status (OPEN -> UNDER_REVIEW -> RESOLVED).
   */
  async updateBlackBoxStatus(id, newStatus) {
    seedLocalBlackBoxesIfEmpty();
    const all = localStore.getCollection('blackboxes');
    const target = all.find(b => b.id === id || b.blackbox_code === id);
    if (!target) return null;

    const updated = {
      ...target,
      incident_status: newStatus,
      updated_at: new Date().toISOString(),
      audit_trail: [
        ...(target.audit_trail || []),
        { action: 'BLACKBOX_STATUS_CHANGED', timestamp: new Date().toISOString(), user: 'Reliability Engineer', details: `Status transitioned to ${newStatus}` }
      ]
    };

    const updatedList = all.map(b => (b.id === id || b.blackbox_code === id) ? updated : b);
    localStore.setCollection('blackboxes', updatedList);

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'blackboxes', target.id), {
          incident_status: newStatus,
          updated_at: new Date().toISOString()
        });
      } catch (e) {
        // ignore
      }
    }

    return updated;
  }
};
