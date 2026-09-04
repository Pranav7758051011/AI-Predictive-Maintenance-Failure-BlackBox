/**
 * INDUSENSE AI - Firebase & Realtime Machine Management Service
 * Provides full CRUD operations, live status streaming, and automatic industrial fleet seeding.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { db, isFirebaseConfigured, localStore } from './config';

const INITIAL_FLEET = [
  {
    id: '6a9acaf94948975b4633ae61',
    serial_number: 'CNC-204',
    name: '5-Axis Heavy CNC Milling Center',
    product_type: 'M',
    location: 'Bay 4 - Sector A',
    status: 'HEALTHY',
    current_health_score: 98.0,
    current_rul_hours: 495.0,
    assigned_engineer_id: 'usr-demo-eng-01',
    assigned_engineer: {
      id: 'usr-demo-eng-01',
      email: 'engineer.lead@factory.io',
      full_name: 'Lead Reliability Engineer',
      role: 'ENGINEER'
    },
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '6a9acaf94948975b4633ae62',
    serial_number: 'PRESS-102',
    name: 'Hydraulic Stamping Press',
    product_type: 'H',
    location: 'Bay 2 - Press Bay',
    status: 'HEALTHY',
    current_health_score: 95.0,
    current_rul_hours: 480.0,
    assigned_engineer_id: 'usr-demo-eng-01',
    assigned_engineer: {
      id: 'usr-demo-eng-01',
      email: 'engineer.lead@factory.io',
      full_name: 'Lead Reliability Engineer',
      role: 'ENGINEER'
    },
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '6a9acaf94948975b4633ae63',
    serial_number: 'CNC-933',
    name: '5-Axis CNC Milling Station',
    product_type: 'M',
    location: 'Bay 3, Sector B',
    status: 'HEALTHY',
    current_health_score: 96.0,
    current_rul_hours: 490.0,
    assigned_engineer_id: 'usr-demo-eng-01',
    assigned_engineer: {
      id: 'usr-demo-eng-01',
      email: 'engineer.lead@factory.io',
      full_name: 'Lead Reliability Engineer',
      role: 'ENGINEER'
    },
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '6a9acaf94948975b4633ae64',
    serial_number: 'MOTOR-308',
    name: 'High-Power Induction Drive Motor',
    product_type: 'L',
    location: 'Bay 1 - Powerhouse',
    status: 'CRITICAL',
    current_health_score: 12.0,
    current_rul_hours: 3.5,
    assigned_engineer_id: 'usr-demo-eng-01',
    assigned_engineer: {
      id: 'usr-demo-eng-01',
      email: 'engineer.lead@factory.io',
      full_name: 'Lead Reliability Engineer',
      role: 'ENGINEER'
    },
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date().toISOString()
  }
];

function seedLocalFleetIfEmpty() {
  const current = localStore.getCollection('machines');
  if (!current || current.length === 0) {
    localStore.setCollection('machines', INITIAL_FLEET);
    return INITIAL_FLEET;
  }
  return current;
}

export const firebaseMachineService = {
  /**
   * Retrieves list of machines with search, status, and product_type filters.
   */
  async listMachines(params = {}) {
    seedLocalFleetIfEmpty();
    let machines = localStore.getCollection('machines');

    if (isFirebaseConfigured && db) {
      try {
        const q = query(collection(db, 'machines'), orderBy('created_at', 'desc'));
        const snap = await getDocs(q);
        if (!snap.empty) {
          machines = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          localStore.setCollection('machines', machines);
        } else {
          // Seed Firestore if empty
          for (const m of INITIAL_FLEET) {
            await setDoc(doc(db, 'machines', m.id), m);
          }
        }
      } catch (e) {
        console.warn('Firestore machine list notice:', e);
      }
    }

    // Apply Client-Side Filtering
    let filtered = [...machines];
    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(m =>
        m.name?.toLowerCase().includes(q) ||
        m.serial_number?.toLowerCase().includes(q) ||
        m.location?.toLowerCase().includes(q)
      );
    }
    if (params.status && params.status !== 'ALL') {
      filtered = filtered.filter(m => m.status === params.status);
    }
    if (params.product_type && params.product_type !== 'ALL') {
      filtered = filtered.filter(m => m.product_type === params.product_type);
    }

    const page = Number(params.page) || 1;
    const pageSize = Number(params.page_size) || 20;
    const total = filtered.length;
    const startIdx = (page - 1) * pageSize;
    const items = filtered.slice(startIdx, startIdx + pageSize);

    return {
      items,
      total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize) || 1
    };
  },

  /**
   * Retrieves a single machine by ID.
   */
  async getMachineById(id) {
    seedLocalFleetIfEmpty();
    const machines = localStore.getCollection('machines');
    let found = machines.find(m => m.id === id || m.serial_number === id);

    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDoc(doc(db, 'machines', id));
        if (snap.exists()) {
          found = { id: snap.id, ...snap.data() };
        }
      } catch (e) {
        // ignore
      }
    }

    if (!found) {
      // Fallback: create dynamic placeholder if navigated directly
      found = {
        id,
        serial_number: `MACH-${id.substring(0, 6).toUpperCase()}`,
        name: 'Industrial CNC Machining Station',
        product_type: 'M',
        location: 'Bay 3, Sector B',
        status: 'HEALTHY',
        current_health_score: 95.0,
        current_rul_hours: 480.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.createMachine(found);
    }
    return found;
  },

  /**
   * Creates a new machine in the fleet.
   */
  async createMachine(machineData) {
    seedLocalFleetIfEmpty();
    const id = machineData.id || `mach-${Date.now()}`;
    const newMachine = {
      id,
      serial_number: String(machineData.serial_number || `CNC-${Date.now()}`).toUpperCase(),
      name: machineData.name || 'CNC Station',
      product_type: machineData.product_type || 'M',
      location: machineData.location || 'Sector 1',
      status: machineData.status || 'HEALTHY',
      current_health_score: machineData.current_health_score !== undefined ? machineData.current_health_score : 98.0,
      current_rul_hours: machineData.current_rul_hours || 490.0,
      assigned_engineer_id: machineData.assigned_engineer_id || null,
      assigned_engineer: machineData.assigned_engineer || null,
      specifications: machineData.specifications || { rated_power_kw: 15.0 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const machines = localStore.getCollection('machines');
    const updatedList = [newMachine, ...machines.filter(m => m.id !== id && m.serial_number !== newMachine.serial_number)];
    localStore.setCollection('machines', updatedList);

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'machines', id), newMachine);
      } catch (e) {
        console.warn('Firestore machine create notice:', e);
      }
    }

    return newMachine;
  },

  /**
   * Updates an existing machine's properties or status.
   */
  async updateMachine(id, updateData) {
    seedLocalFleetIfEmpty();
    const machines = localStore.getCollection('machines');
    let target = machines.find(m => m.id === id);
    if (!target) return null;

    const updated = {
      ...target,
      ...updateData,
      updated_at: new Date().toISOString()
    };

    const newList = machines.map(m => m.id === id ? updated : m);
    localStore.setCollection('machines', newList);

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'machines', id), updateData);
      } catch (e) {
        // ignore
      }
    }

    return updated;
  },

  /**
   * Deletes a machine from the catalog.
   */
  async deleteMachine(id) {
    seedLocalFleetIfEmpty();
    const machines = localStore.getCollection('machines');
    const filtered = machines.filter(m => m.id !== id);
    localStore.setCollection('machines', filtered);

    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'machines', id));
      } catch (e) {
        // ignore
      }
    }

    return true;
  },

  /**
   * Assigns a reliability engineer to a machine.
   */
  async assignEngineer(machineId, engineerId, engineerObj = null) {
    return await this.updateMachine(machineId, {
      assigned_engineer_id: engineerId,
      assigned_engineer: engineerObj || { id: engineerId, full_name: 'Assigned Plant Engineer' }
    });
  },

  /**
   * Subscribes to live real-time fleet changes across all browser tabs.
   */
  subscribeToFleet(callback) {
    if (isFirebaseConfigured && db) {
      try {
        const q = query(collection(db, 'machines'), orderBy('created_at', 'desc'));
        return onSnapshot(q, (snap) => {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          callback(list);
        });
      } catch (e) {
        // Fallback to localStore
      }
    }

    return localStore.subscribe('machines', callback);
  }
};
