import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchThingSpeakData } from '../api/thingspeak';
import { getPrediction } from '../api/flask';
import { saveToFirebase, getAlertHistory } from '../api/firebase';

const AppContext = createContext(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

// Generate simulated sensor data as fallback
const generateSimulatedData = () => {
  const heartRate = Math.floor(Math.random() * 60) + 60; // 60-120
  const stress = Math.floor(Math.random() * 80) + 10;     // 10-90
  const motion = parseFloat((Math.random() * 8 + 0.5).toFixed(2)); // 0.5-8.5
  return { heartRate, stress, motion };
};

export const AppProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Current sensor readings
  const [sensorData, setSensorData] = useState({
    heartRate: 72,
    stress: 35,
    motion: 1.2,
    timestamp: new Date().toISOString(),
  });

  // Historical data for charts (last 20 readings)
  const [history, setHistory] = useState({
    labels: [],
    heartRate: [],
    stress: [],
    motion: [],
    risk: [],
  });

  // AI prediction state
  const [prediction, setPrediction] = useState({
    risk: 'LOW',
    confidence: 92,
    message: 'All vitals within normal range.',
    recommendations: [
      'Maintain regular breathing exercises.',
      'Stay hydrated throughout the day.',
      'Take short breaks every 45 minutes.',
    ],
  });

  // Device & cloud status
  const [deviceStatus, setDeviceStatus] = useState({
    esp32: true,
    wifi: true,
    thingspeak: false,
    firebase: false,
    lastUpdate: new Date().toISOString(),
  });

  // Alerts
  const [alerts, setAlerts] = useState([]);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Firebase alert history
  const [alertHistory, setAlertHistory] = useState([]);

  // Hallucination risk state (from SQLite hybrid engine)
  const [hallucinationData, setHallucinationData] = useState({
    hallucination_risk: 0,
    hallucination_level: 'LOW',
    sleep_quality_score: 0,
    sleep_status: 'AWAKE',
    voice_trigger: false,
    voice_message: '',
    recommendations: [],
  });

  const intervalRef = useRef(null);

  // Add a time label
  const getTimeLabel = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  };

  // Append to history (keep last 20)
  const appendHistory = useCallback((data, riskLevel) => {
    setHistory(prev => {
      const maxPoints = 20;
      const newLabels = [...prev.labels, getTimeLabel()].slice(-maxPoints);
      const newHR = [...prev.heartRate, data.heartRate].slice(-maxPoints);
      const newStress = [...prev.stress, data.stress].slice(-maxPoints);
      const newMotion = [...prev.motion, data.motion].slice(-maxPoints);
      const riskMap = { LOW: 1, MEDIUM: 2, HIGH: 3 };
      const newRisk = [...prev.risk, riskMap[riskLevel] || 1].slice(-maxPoints);
      return { labels: newLabels, heartRate: newHR, stress: newStress, motion: newMotion, risk: newRisk };
    });
  }, []);

  // Evaluate alert conditions
  const evaluateAlerts = useCallback((data, pred) => {
    const newAlerts = [];
    if (data.heartRate > 110) newAlerts.push({ type: 'danger', message: `High Heart Rate: ${data.heartRate} BPM`, time: new Date().toISOString() });
    if (data.stress > 75) newAlerts.push({ type: 'danger', message: `Critical Stress Level: ${data.stress}%`, time: new Date().toISOString() });
    if (data.motion > 7) newAlerts.push({ type: 'warning', message: `Abnormal Motion Detected: ${data.motion}`, time: new Date().toISOString() });
    if (pred.risk === 'HIGH') newAlerts.push({ type: 'danger', message: `AI Detected HIGH Risk (${pred.confidence}% confidence)`, time: new Date().toISOString() });

    if (newAlerts.length > 0) {
      setAlerts(newAlerts);
      setEmergencyActive(newAlerts.some(a => a.type === 'danger'));
      setNotifications(prev => [...newAlerts.map(a => ({ ...a, id: Date.now() + Math.random() })), ...prev].slice(0, 20));
      // Save to Firebase
      saveToFirebase({ sensorData: data, prediction: pred, alerts: newAlerts }).catch(() => {});
    } else {
      setAlerts([]);
      setEmergencyActive(false);
    }
  }, []);

  // Main data fetch cycle
  const fetchAndUpdate = useCallback(async () => {
    try {
      // Try ThingSpeak
      const tsData = await fetchThingSpeakData();
      const data = tsData || generateSimulatedData();
      const ts = new Date().toISOString();

      setSensorData({ ...data, timestamp: ts });
      setDeviceStatus(prev => ({
        ...prev,
        thingspeak: !!tsData,
        esp32: true,
        wifi: true,
        lastUpdate: ts,
      }));

      // Get AI prediction
      let pred = prediction;
      try {
        pred = await getPrediction(data);
        setPrediction(pred);
        setDeviceStatus(prev => ({ ...prev, firebase: true }));
      } catch {
        // Use local fallback prediction
        const risk = data.heartRate > 110 || data.stress > 75 ? 'HIGH'
          : data.heartRate > 90 || data.stress > 50 ? 'MEDIUM' : 'LOW';
        pred = {
          risk,
          confidence: Math.floor(Math.random() * 15) + 80,
          message: risk === 'HIGH' ? 'Elevated stress and heart rate detected.'
            : risk === 'MEDIUM' ? 'Moderate stress levels, monitor closely.'
            : 'All vitals within normal range.',
          recommendations: risk === 'HIGH'
            ? ['Take deep breaths immediately.', 'Find a quiet space to rest.', 'Contact caregiver if symptoms persist.']
            : risk === 'MEDIUM'
            ? ['Practice mindfulness for 5 minutes.', 'Reduce screen time.', 'Stay hydrated.']
            : ['Maintain regular breathing exercises.', 'Stay hydrated throughout the day.', 'Take short breaks every 45 minutes.'],
        };
        setPrediction(pred);
      }

      appendHistory(data, pred.risk);
      evaluateAlerts(data, pred);

      // Call Hallucination Predict endpoint (feeds SQLite + returns risk)
      try {
        const FLASK_URL = import.meta.env.VITE_FLASK_URL || 'http://localhost:5000';
        const hallRes = await fetch(`${FLASK_URL}/api/hallucination/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            risk: pred.risk,
            confidence: pred.confidence,
            heart_rate: data.heartRate,
            stress: data.stress,
            motion: data.motion,
          }),
        });
        if (hallRes.ok) {
          const hallData = await hallRes.json();
          setHallucinationData(hallData);
        }
      } catch {
        // Flask not running – skip silently
      }

    } catch (err) {
      console.error('Fetch error:', err);
    }
  }, [appendHistory, evaluateAlerts, prediction]);

  // Start polling every 15 seconds
  useEffect(() => {
    fetchAndUpdate();
    intervalRef.current = setInterval(fetchAndUpdate, 15000);
    return () => clearInterval(intervalRef.current);
  }, []); // eslint-disable-line

  // Load alert history from Firebase
  useEffect(() => {
    getAlertHistory().then(setAlertHistory).catch(() => {});
  }, []);

  // Theme toggle
  const toggleTheme = () => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
    document.documentElement.classList.toggle('light');
  };

  const dismissEmergency = () => setEmergencyActive(false);
  const clearNotification = (id) => setNotifications(prev => prev.filter(n => n.id !== id));

  const value = {
    theme, toggleTheme,
    sidebarOpen, setSidebarOpen,
    notificationsOpen, setNotificationsOpen,
    sensorData,
    history,
    prediction,
    deviceStatus,
    alerts,
    emergencyActive, dismissEmergency,
    notifications, clearNotification,
    alertHistory,
    hallucinationData,
    refreshData: fetchAndUpdate,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
