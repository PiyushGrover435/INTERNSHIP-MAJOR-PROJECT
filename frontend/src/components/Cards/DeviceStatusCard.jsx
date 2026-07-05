import React from 'react';
import { Cpu, Wifi, Cloud, Database, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { format } from 'date-fns';

const StatusRow = ({ label, icon: Icon, active, detail }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-cyber-border/50 last:border-0">
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center
        ${active ? 'bg-cyber-neonGreen/10 border border-cyber-neonGreen/30' : 'bg-cyber-danger/10 border border-cyber-danger/30'}`}>
        <Icon className={`w-4 h-4 ${active ? 'text-cyber-neonGreen' : 'text-cyber-danger'}`} />
      </div>
      <div>
        <p className="text-xs font-medium text-cyber-text">{label}</p>
        {detail && <p className="text-[10px] text-cyber-muted">{detail}</p>}
      </div>
    </div>
    <div className="flex items-center gap-2">
      {active
        ? <CheckCircle className="w-4 h-4 text-cyber-neonGreen" />
        : <XCircle className="w-4 h-4 text-cyber-danger" />
      }
      <span className={`text-[10px] font-mono font-bold ${active ? 'text-cyber-neonGreen' : 'text-cyber-danger'}`}>
        {active ? 'ONLINE' : 'OFFLINE'}
      </span>
    </div>
  </div>
);

const DeviceStatusCard = () => {
  const { deviceStatus } = useApp();

  return (
    <div className="glass rounded-2xl p-5 neon-border-cyan">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-cyber-text">Device & Cloud Status</h3>
        <div className="flex items-center gap-1.5 text-[10px] text-cyber-muted font-mono">
          <Clock className="w-3 h-3" />
          {deviceStatus.lastUpdate
            ? format(new Date(deviceStatus.lastUpdate), 'HH:mm:ss')
            : '--:--:--'}
        </div>
      </div>

      <StatusRow label="ESP32 Device" icon={Cpu} active={deviceStatus.esp32} detail="Wokwi Simulation" />
      <StatusRow label="WiFi Connection" icon={Wifi} active={deviceStatus.wifi} detail="2.4 GHz Band" />
      <StatusRow label="ThingSpeak Cloud" icon={Cloud} active={deviceStatus.thingspeak} detail="Field1, Field2, Field3" />
      <StatusRow label="Firebase Database" icon={Database} active={deviceStatus.firebase} detail="Realtime DB" />

      {/* Uptime indicator */}
      <div className="mt-4 p-3 rounded-xl bg-cyber-neon/5 border border-cyber-neon/10">
        <div className="flex justify-between text-[10px] text-cyber-muted mb-1.5">
          <span>System Health</span>
          <span className="text-cyber-neon font-mono">
            {[deviceStatus.esp32, deviceStatus.wifi, deviceStatus.thingspeak, deviceStatus.firebase]
              .filter(Boolean).length * 25}%
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${[deviceStatus.esp32, deviceStatus.wifi, deviceStatus.thingspeak, deviceStatus.firebase]
                .filter(Boolean).length * 25}%`,
              background: 'linear-gradient(90deg, #00f5ff, #00ff88)',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default DeviceStatusCard;
