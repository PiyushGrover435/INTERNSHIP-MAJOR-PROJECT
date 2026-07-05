import axios from 'axios';

// ============================================================
// CONFIGURE YOUR THINGSPEAK CHANNEL HERE
// ============================================================
const CHANNEL_ID = import.meta.env.VITE_THINGSPEAK_CHANNEL_ID || '3405642';
const READ_API_KEY = import.meta.env.VITE_THINGSPEAK_API_KEY || 'GV1CLON6L98GLVWG';
const BASE_URL = 'https://api.thingspeak.com';

/**
 * Fetch the latest sensor reading from ThingSpeak.
 * Field1 = Heart Rate (potentiometer)
 * Field2 = Stress Score
 * Field3 = Motion (MPU6050)
 * Returns null if not configured or request fails.
 */
export const fetchThingSpeakData = async () => {
  if (CHANNEL_ID === 'YOUR_CHANNEL_ID') {
    return null; // Not configured — use simulated data
  }


  try {
    const response = await axios.get(
      `${BASE_URL}/channels/${CHANNEL_ID}/feeds/last.json`,
      {
        params: { api_key: READ_API_KEY },
        timeout: 8000,
      }
    );

    const feed = response.data;
    const heartRate = parseFloat(feed.field1) || 72;
    const stress = parseFloat(feed.field2) || 35;
    const motion = parseFloat(feed.field3) || 1.2;

    return { heartRate, stress, motion };
  } catch (error) {
    console.warn('ThingSpeak fetch failed, using simulated data:', error.message);
    return null;
  }
};

/**
 * Fetch multiple recent feeds for analytics/history.
 */
export const fetchThingSpeakHistory = async (results = 50) => {
  if (CHANNEL_ID === 'YOUR_CHANNEL_ID') return [];

  try {
    const response = await axios.get(
      `${BASE_URL}/channels/${CHANNEL_ID}/feeds.json`,
      {
        params: { api_key: READ_API_KEY, results },
        timeout: 10000,
      }
    );

    return response.data.feeds.map(feed => ({
      timestamp: feed.created_at,
      heartRate: parseFloat(feed.field1) || 0,
      stress: parseFloat(feed.field2) || 0,
      motion: parseFloat(feed.field3) || 0,
    }));
  } catch {
    return [];
  }
};
