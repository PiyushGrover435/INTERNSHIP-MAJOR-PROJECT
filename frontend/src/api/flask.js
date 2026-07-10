import axios from 'axios';

const FLASK_BASE = '';

/**
 * Get AI risk prediction from Flask backend.
 * @param {{ heartRate: number, stress: number, motion: number }} sensorData
 * @returns {{ risk: string, confidence: number, message: string, recommendations: string[] }}
 */
export const getPrediction = async (sensorData) => {
  const response = await axios.post(
    `${FLASK_BASE}/api/predict`,
    {
      heart_rate: sensorData.heartRate,
      stress: sensorData.stress,
      motion: sensorData.motion,
    },
    { timeout: 8000 }
  );
  return response.data;
};

/**
 * Get prediction history from Flask/Firebase.
 */
export const getPredictionHistory = async (limit = 100) => {
  const response = await axios.get(`${FLASK_BASE}/api/history`, {
    params: { limit },
    timeout: 8000,
  });
  return response.data;
};

/**
 * Log a sensor snapshot manually.
 */
export const logSensorData = async (payload) => {
  const response = await axios.post(`${FLASK_BASE}/api/log`, payload, {
    timeout: 8000,
  });
  return response.data;
};

/**
 * Health check for Flask backend.
 */
export const checkFlaskHealth = async () => {
  try {
    const response = await axios.get(`${FLASK_BASE}/api/health`, { timeout: 3000 });
    return response.data.status === 'ok';
  } catch {
    return false;
  }
};
