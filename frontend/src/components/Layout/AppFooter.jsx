import React from 'react';
import { useApp } from '../../context/AppContext';
import { Activity, Cloud, RefreshCw, Github } from 'lucide-react';
import { format } from 'date-fns';

const AppFooter = () => {
  const { deviceStatus } = useApp();

  return (
    <footer className="glass border-t border-cyber-border px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-[11px] text-cyber-muted font-mono">
      {/* Left */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-cyber-neon" />
          <span>IoT + AI System</span>
          <div className="status-dot online ml-1" />
        </div>
        <div className="flex items-center gap-1.5">
          <Cloud className="w-3 h-3 text-cyber-neonPurple" />
          <span>Cloud Sync:</span>
          <span className={deviceStatus.thingspeak ? 'text-cyber-neonGreen' : 'text-yellow-400'}>
            {deviceStatus.thingspeak ? 'ThingSpeak Active' : 'Simulation Mode'}
          </span>
        </div>
      </div>

      {/* Center */}
      <div className="flex items-center gap-1.5">
        <RefreshCw className="w-3 h-3" />
        <span>Last Update: </span>
        <span className="text-cyber-neon">
          {deviceStatus.lastUpdate
            ? format(new Date(deviceStatus.lastUpdate), 'HH:mm:ss')
            : '--:--:--'}
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5">
        <Github className="w-3 h-3" />
        <span>ESP32 + MPU6050 + Potentiometer | NeuroWatch AI v1.0</span>
      </div>
    </footer>
  );
};

export default AppFooter;
