/**
 * Notification & Service Worker Utility for NeuroWatch AI
 * Handles: Web Push Registration, emergency notifications, device vibration
 */

// Register the Service Worker on app load
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('[NeuroWatch] Service Worker registered:', reg.scope);
      return reg;
    } catch (err) {
      console.warn('[NeuroWatch] Service Worker registration failed:', err);
    }
  }
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  const result = await Notification.requestPermission();
  return result;
};

/**
 * Fire an emergency notification + vibrate the device.
 * Called when AI detects HIGH risk.
 */
export const fireEmergencyAlert = async ({ heartRate, stress, motion, risk }) => {
  // 1. Vibrate device aggressively (works on Android browsers)
  if ('vibrate' in navigator) {
    navigator.vibrate([500, 200, 500, 200, 1000, 200, 500, 200, 2000]);
  }

  // 2. Show a browser notification (shows even when app is in background)
  if (Notification.permission === 'granted') {
    const reg = await navigator.serviceWorker?.ready;
    const notifOptions = {
      body: `⚠️ HR: ${heartRate} BPM | Stress: ${stress}% | Motion: ${motion} m/s²\nImmediate attention required!`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [500, 200, 500, 200, 1000],
      tag: 'neurowatch-emergency',
      requireInteraction: true,
      renotify: true,
      data: { url: '/dashboard' },
      actions: [
        { action: 'view', title: '🔍 Open Dashboard' },
        { action: 'dismiss', title: '✖ Dismiss' }
      ]
    };

    if (reg) {
      // Service worker notification (works when app is closed)
      await reg.showNotification(`🚨 NeuroWatch: ${risk} RISK ALERT`, notifOptions);
    } else {
      // Fallback: direct browser notification
      new Notification(`🚨 NeuroWatch: ${risk} RISK ALERT`, notifOptions);
    }
  }
};
