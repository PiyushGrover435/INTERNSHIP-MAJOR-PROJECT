import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { AlertTriangle, X, Phone, MapPin } from 'lucide-react';
import { fireEmergencyAlert } from '../../api/notifications';

const EmergencyPopup = () => {
  const { emergencyActive, dismissEmergency, alerts, sensorData } = useApp();
  const audioCtxRef = useRef(null);
  const oscillatorRef = useRef(null);
  const sirenIntervalRef = useRef(null);

  // Load personalized numbers from settings or fallback to defaults
  const caregiver1 = localStorage.getItem('caregiver1') || '+919999999999';
  const caregiver2 = localStorage.getItem('caregiver2') || '+918888888888';

  const [locationLink, setLocationLink] = useState('');

  useEffect(() => {
    if (emergencyActive && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationLink(`https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`);
        },
        (error) => console.error("Error getting location:", error)
      );
    }
  }, [emergencyActive]);

  // Start Siren, Vibration & Web Push Notification
  useEffect(() => {
    if (emergencyActive) {
      // Fire device-level push notification (even if browser tab is hidden)
      fireEmergencyAlert({
        heartRate: sensorData.heartRate,
        stress: sensorData.stress,
        motion: sensorData.motion,
        risk: 'HIGH'
      });
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!audioCtxRef.current && AudioContext) {
          audioCtxRef.current = new AudioContext();
          const osc = audioCtxRef.current.createOscillator();
          const gainNode = audioCtxRef.current.createGain();
          
          osc.type = 'square';
          osc.frequency.setValueAtTime(800, audioCtxRef.current.currentTime);
          gainNode.gain.value = 0.1; // Keep it low but noticeable
          
          osc.connect(gainNode);
          gainNode.connect(audioCtxRef.current.destination);
          osc.start();
          oscillatorRef.current = osc;

          let isHigh = false;
          sirenIntervalRef.current = setInterval(() => {
            if (audioCtxRef.current) {
              osc.frequency.setValueAtTime(isHigh ? 1200 : 800, audioCtxRef.current.currentTime);
            }
            isHigh = !isHigh;
            if (navigator.vibrate) navigator.vibrate([400, 100]); // Aggressive shake
          }, 500);
        }
      } catch (e) {
        console.error("Audio Context failed:", e);
      }
    } else {
      // Stop Siren & Vibration
      if (sirenIntervalRef.current) clearInterval(sirenIntervalRef.current);
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      if (navigator.vibrate) navigator.vibrate(0);
    }
    
    return () => {
      if (sirenIntervalRef.current) clearInterval(sirenIntervalRef.current);
      if (navigator.vibrate) navigator.vibrate(0);
    };
  }, [emergencyActive]);

  // Auto-dismiss after 30 seconds
  useEffect(() => {
    if (!emergencyActive) return;
    const t = setTimeout(dismissEmergency, 30000);
    return () => clearTimeout(t);
  }, [emergencyActive, dismissEmergency]);

  if (!emergencyActive) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={dismissEmergency} />

      {/* Modal */}
      <div className="relative max-w-md w-full animate-shake">
        <div className="glass-strong rounded-2xl border-2 border-cyber-danger/60 overflow-hidden
          shadow-[0_0_60px_rgba(255,61,113,0.4)]">
          {/* Animated border */}
          <div className="absolute inset-0 rounded-2xl border-2 border-cyber-danger animate-pulse pointer-events-none" />

          {/* Header */}
          <div className="bg-gradient-to-r from-red-900/60 to-cyber-danger/20 p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <AlertTriangle className="w-8 h-8 text-cyber-danger" />
                <div className="absolute inset-0 animate-ping">
                  <AlertTriangle className="w-8 h-8 text-cyber-danger opacity-30" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold text-cyber-danger">EMERGENCY ALERT</h2>
                <p className="text-xs text-red-300">Immediate attention required</p>
              </div>
            </div>
            <button onClick={dismissEmergency} className="text-cyber-muted hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {/* Active alerts list */}
            <div className="space-y-2">
              {alerts.filter(a => a.type === 'danger').map((a, i) => (
                <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-red-900/20 border border-cyber-danger/30">
                  <AlertTriangle className="w-4 h-4 text-cyber-danger flex-shrink-0" />
                  <span className="text-sm text-cyber-text">{a.message}</span>
                </div>
              ))}
            </div>

            {/* Vital readings at time of alert */}
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'Heart Rate', value: `${sensorData.heartRate} BPM`, warn: sensorData.heartRate > 110 },
                { label: 'Stress', value: `${sensorData.stress}%`, warn: sensorData.stress > 75 },
                { label: 'Motion', value: `${sensorData.motion}`, warn: sensorData.motion > 7 },
              ].map(({ label, value, warn }) => (
                <div key={label} className={`p-2 rounded-lg border ${warn ? 'border-cyber-danger/40 bg-red-900/20' : 'border-cyber-border bg-cyber-surface'}`}>
                  <div className={`text-sm font-bold font-mono ${warn ? 'text-cyber-danger' : 'text-cyber-text'}`}>{value}</div>
                  <div className="text-[10px] text-cyber-muted">{label}</div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <a href={`tel:${caregiver1}`} className="flex-1 py-2.5 rounded-xl bg-cyber-danger/20 border border-cyber-danger/40 
                  text-cyber-danger font-semibold text-xs hover:bg-cyber-danger/30 transition-all
                  flex items-center justify-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  Call {caregiver1.slice(0, 5)}...
                </a>
                <a href={`tel:${caregiver2}`} className="flex-1 py-2.5 rounded-xl bg-cyber-danger/20 border border-cyber-danger/40 
                  text-cyber-danger font-semibold text-xs hover:bg-cyber-danger/30 transition-all
                  flex items-center justify-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  Call {caregiver2.slice(0, 5)}...
                </a>
              </div>
              <div className="flex gap-3">
                <a 
                  href={locationLink ? `sms:${caregiver1}?body=Emergency!%20Patient%20needs%20help.%20Location:%20${encodeURIComponent(locationLink)}` : '#'} 
                  className={`flex-1 py-2.5 rounded-xl border font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all
                    ${locationLink ? 'border-cyber-danger/40 bg-cyber-danger/20 text-cyber-danger hover:bg-cyber-danger/30 shadow-[0_0_15px_rgba(255,61,113,0.2)]' : 'border-cyber-border/40 bg-cyber-surface text-cyber-muted cursor-not-allowed'}`}
                  onClick={(e) => !locationLink && e.preventDefault()}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  SMS Location
                </a>
                <a 
                  href={locationLink ? `https://wa.me/${caregiver1.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Emergency! Patient needs help. Location: ' + locationLink)}` : '#'} 
                  target="_blank" rel="noreferrer"
                  className={`flex-1 py-2.5 rounded-xl border font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all
                    ${locationLink ? 'border-[#25D366]/40 bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 shadow-[0_0_15px_rgba(37,211,102,0.2)]' : 'border-cyber-border/40 bg-cyber-surface text-cyber-muted cursor-not-allowed'}`}
                  onClick={(e) => !locationLink && e.preventDefault()}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  WhatsApp Location
                </a>
              </div>
              <button
                onClick={dismissEmergency}
                className="w-full py-2.5 rounded-xl glass border border-cyber-border 
                  text-cyber-muted font-semibold text-sm hover:border-cyber-neon/30 hover:text-cyber-text transition-all"
              >
                Dismiss Alert
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyPopup;
