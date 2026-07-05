import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Menu, Bell, Sun, Moon, RefreshCw, User } from 'lucide-react';
import { format } from 'date-fns';

const routeTitles = {
  '/': 'Home',
  '/dashboard': 'Live Dashboard',
  '/analytics': 'Analytics',
  '/ai-prediction': 'AI Prediction',
  '/alert-history': 'Alert History',
  '/about': 'About Project',
};

const Header = () => {
  const { setSidebarOpen, theme, toggleTheme, notifications, setNotificationsOpen, 
    notificationsOpen, prediction, deviceStatus, refreshData } = useApp();
  const location = useLocation();
  const [now, setNow] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setTimeout(() => setRefreshing(false), 800);
  };

  const unreadCount = notifications.length;
  const riskColors = { LOW: 'text-cyber-neonGreen', MEDIUM: 'text-yellow-400', HIGH: 'text-cyber-danger' };

  return (
    <header className="glass-strong border-b border-cyber-border px-4 py-3 flex items-center justify-between sticky top-0 z-30">
      {/* Left: menu + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 rounded-lg text-cyber-muted hover:text-cyber-neon hover:bg-cyber-neon/10 transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-sm font-semibold text-cyber-text">
            {routeTitles[location.pathname] || 'Dashboard'}
          </h2>
          <div className="flex items-center gap-2">
            <div className="status-dot online" />
            <span className="text-[10px] text-cyber-muted font-mono">
              {format(now, 'dd MMM yyyy · HH:mm:ss')}
            </span>
          </div>
        </div>
      </div>

      {/* Center: risk level chip */}
      <div className="hidden md:flex items-center gap-3">
        <div className={`px-3 py-1 rounded-full text-xs font-bold font-mono border
          ${prediction.risk === 'HIGH' ? 'risk-high animate-pulse' : prediction.risk === 'MEDIUM' ? 'risk-medium' : 'risk-low'}`}>
          ● {prediction.risk} RISK
        </div>
        <span className="text-cyber-muted text-xs font-mono">
          {prediction.confidence}% confidence
        </span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Refresh */}
        <button
          onClick={handleRefresh}
          className="p-2 rounded-lg text-cyber-muted hover:text-cyber-neon hover:bg-cyber-neon/10 transition-all"
          title="Refresh data"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyber-neon' : ''}`} />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-cyber-muted hover:text-cyber-neonYellow hover:bg-yellow-400/10 transition-all"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(o => !o)}
            className="p-2 rounded-lg text-cyber-muted hover:text-cyber-neonPink hover:bg-pink-500/10 transition-all"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="notif-badge animate-pulse">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
        </div>

        {/* Profile */}
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass border border-cyber-border 
          hover:border-cyber-neon/30 transition-all">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyber-neon to-cyber-neonPurple 
            flex items-center justify-center">
            <User className="w-3 h-3 text-white" />
          </div>
          <span className="hidden sm:block text-xs text-cyber-muted">Monitor</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
