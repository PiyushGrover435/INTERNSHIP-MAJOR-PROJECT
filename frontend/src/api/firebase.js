import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, get, query, orderByChild, limitToLast } from 'firebase/database';

// ============================================================
// CONFIGURE YOUR FIREBASE PROJECT HERE
// ============================================================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

let app = null;
let db = null;

const isConfigured = () => !!firebaseConfig.databaseURL;

const getFirebaseDb = () => {
  if (!isConfigured()) return null;
  if (!app) {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
  }
  return db;
};

/**
 * Save sensor snapshot + prediction + alerts to Firebase.
 */
export const saveToFirebase = async ({ sensorData, prediction, alerts }) => {
  const database = getFirebaseDb();
  if (!database) return;

  const record = {
    timestamp: new Date().toISOString(),
    heartRate: sensorData.heartRate,
    stress: sensorData.stress,
    motion: sensorData.motion,
    risk: prediction.risk,
    confidence: prediction.confidence,
    alerts: alerts || [],
  };

  await push(ref(database, 'records'), record);
  if (alerts && alerts.length > 0) {
    for (const alert of alerts) {
      await push(ref(database, 'alerts'), { ...alert, ...record });
    }
  }
};

/**
 * Fetch last N alert records from Firebase.
 */
export const getAlertHistory = async (limit = 50) => {
  const database = getFirebaseDb();
  if (!database) return getMockAlertHistory();

  try {
    const alertsRef = query(
      ref(database, 'alerts'),
      orderByChild('timestamp'),
      limitToLast(limit)
    );
    const snapshot = await get(alertsRef);
    if (!snapshot.exists()) return [];

    const data = [];
    snapshot.forEach(child => data.push({ id: child.key, ...child.val() }));
    return data.reverse();
  } catch {
    return getMockAlertHistory();
  }
};

/**
 * Fetch sensor history records from Firebase.
 */
export const getSensorHistory = async (limit = 100) => {
  const database = getFirebaseDb();
  if (!database) return [];

  try {
    const recordsRef = query(
      ref(database, 'records'),
      orderByChild('timestamp'),
      limitToLast(limit)
    );
    const snapshot = await get(recordsRef);
    if (!snapshot.exists()) return [];

    const data = [];
    snapshot.forEach(child => data.push({ id: child.key, ...child.val() }));
    return data.reverse();
  } catch {
    return [];
  }
};

// Fallback mock data for demonstration when Firebase is not configured
const getMockAlertHistory = () => {
  const now = Date.now();
  return [
    { id: '1', type: 'danger', message: 'High Heart Rate: 118 BPM', risk: 'HIGH', confidence: 94, heartRate: 118, stress: 78, motion: 2.1, timestamp: new Date(now - 120000).toISOString() },
    { id: '2', type: 'warning', message: 'Moderate Stress Level: 65%', risk: 'MEDIUM', confidence: 87, heartRate: 88, stress: 65, motion: 1.8, timestamp: new Date(now - 300000).toISOString() },
    { id: '3', type: 'danger', message: 'Critical Stress Level: 82%', risk: 'HIGH', confidence: 96, heartRate: 112, stress: 82, motion: 3.2, timestamp: new Date(now - 600000).toISOString() },
    { id: '4', type: 'warning', message: 'Abnormal Motion Detected: 7.8', risk: 'MEDIUM', confidence: 81, heartRate: 95, stress: 55, motion: 7.8, timestamp: new Date(now - 900000).toISOString() },
    { id: '5', type: 'info', message: 'All vitals returned to normal', risk: 'LOW', confidence: 98, heartRate: 72, stress: 30, motion: 1.1, timestamp: new Date(now - 1200000).toISOString() },
  ];
};
