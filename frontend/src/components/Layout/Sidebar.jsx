import React from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard, Activity, Brain, History,
  Info, Home, X, Wifi, Cpu, AlertTriangle, BarChart2, Microscope, UserRound, Settings as SettingsIcon
} from 'lucide-react';

const navItems = [
  { path: '/',                  label: 'Home',              icon: Home          },
  { path: '/dashboard',          label: 'Dashboard',         icon: LayoutDashboard },
  { path: '/analytics',          label: 'Analytics',         icon: BarChart2     },
  { path: '/ai-prediction',      label: 'AI Prediction',     icon: Brain         },
  { path: '/eeg-simulator',      label: 'EEG Simulator',     icon: Microscope    },
  { path: '/patient-behaviour',  label: 'Patient Behaviour', icon: UserRound     },
  { path: '/alert-history',      label: 'Alert History',     icon: History       },
  { path: '/about',              label: 'About',             icon: Info          },
  { path: '/settings',           label: 'Settings',          icon: SettingsIcon  },
];

const Sidebar = () => {
  const { sidebarOpen, setSidebarOpen, deviceStatus, alerts } = useApp();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 z-50 sidebar-transition
          glass-strong flex flex-col overflow-hidden
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:relative lg:z-auto`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-cyber-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyber-neon/20 to-cyber-neonPurple/20 
                border border-cyber-neon/30 flex items-center justify-center">
                <Activity className="w-5 h-5 text-cyber-neon" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyber-neonGreen 
                shadow-[0_0_6px_#00ff88]">
                <div className="absolute inset-0 rounded-full bg-cyber-neonGreen animate-ping opacity-60" />
              </div>
            </div>
            <div>
              <h1 className="text-sm font-bold text-cyber-neon" style={{ textShadow: '0 0 10px #00f5ff' }}>
                NeuroWatch
              </h1>
              <p className="text-[10px] text-cyber-muted font-mono">AI IoT Monitor</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-cyber-muted hover:text-cyber-neon transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 min-h-0 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-cyber-neon/10 text-cyber-neon border border-cyber-neon/30 shadow-[0_0_10px_rgba(0,245,255,0.1)]'
                  : 'text-cyber-muted hover:text-cyber-text hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyber-neon' : ''}`} />
                  {label}
                  {label === 'Alert History' && alerts.length > 0 && (
                    <span className="ml-auto bg-cyber-danger text-white text-[10px] font-bold 
                      rounded-full w-5 h-5 flex items-center justify-center
                      shadow-[0_0_8px_#ff3d71]">
                      {alerts.length}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Device Status Footer */}
        <div className="p-4 border-t border-cyber-border space-y-2">
          <p className="text-[10px] text-cyber-muted font-mono uppercase tracking-wider mb-3">
            System Status
          </p>
          {[
            { label: 'ESP32', active: deviceStatus.esp32, icon: Cpu },
            { label: 'WiFi', active: deviceStatus.wifi, icon: Wifi },
            { label: 'ThingSpeak', active: deviceStatus.thingspeak, icon: Activity },
            { label: 'Firebase', active: deviceStatus.firebase, icon: AlertTriangle },
          ].map(({ label, active, icon: Icon }) => (
            <div key={label} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-cyber-muted">
                <Icon className="w-3 h-3" />
                {label}
              </div>
              <div className="flex items-center gap-1">
                <div className={`status-dot ${active ? 'online' : 'offline'}`} />
                <span className={`text-[10px] font-mono ${active ? 'text-cyber-neonGreen' : 'text-cyber-danger'}`}>
                  {active ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
