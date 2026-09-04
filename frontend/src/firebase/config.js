/**
 * INDUSENSE AI - Firebase Initialization & Multi-Mode Storage Gateway
 * Supports live Cloud Firestore / Firebase Auth when env vars are present,
 * and seamlessly provides a high-speed Realtime Local Engine when running in zero-config mode.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY'
);

let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    console.info('[INDUSENSE AI] Connected to live Cloud Firestore & Firebase Auth project:', firebaseConfig.projectId);
  } catch (err) {
    console.warn('[INDUSENSE AI] Firebase initialization notice:', err.message);
  }
}

export { app, auth, db };

// Local Reactive Storage Layer (BroadcastChannel + LocalStorage for multi-tab real-time sync)
class LocalRealtimeStore {
  constructor() {
    this.channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('indusense_realtime_bus') : null;
    this.listeners = new Map();

    if (this.channel) {
      this.channel.onmessage = (event) => {
        const { collection, action, data } = event.data || {};
        const callbacks = this.listeners.get(collection) || [];
        callbacks.forEach(cb => {
          try { cb(this.getCollection(collection)); } catch (e) { console.error(e); }
        });
      };
    }
  }

  getCollection(name) {
    try {
      const raw = localStorage.getItem(`indusense_${name}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  setCollection(name, items) {
    try {
      localStorage.setItem(`indusense_${name}`, JSON.stringify(items));
      if (this.channel) {
        this.channel.postMessage({ collection: name, action: 'UPDATE', data: items });
      }
      const callbacks = this.listeners.get(name) || [];
      callbacks.forEach(cb => {
        try { cb(items); } catch (e) { console.error(e); }
      });
    } catch (err) {
      console.error('Local store write error:', err);
    }
  }

  subscribe(collectionName, callback) {
    if (!this.listeners.has(collectionName)) {
      this.listeners.set(collectionName, []);
    }
    this.listeners.get(collectionName).push(callback);
    // Initial emit
    callback(this.getCollection(collectionName));

    return () => {
      const arr = this.listeners.get(collectionName) || [];
      this.listeners.set(collectionName, arr.filter(cb => cb !== callback));
    };
  }
}

export const localStore = new LocalRealtimeStore();
