import React from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, X, AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const NotificationPanel = () => {
  const { notificationsOpen, setNotificationsOpen, notifications, clearNotification } = useApp();

  if (!notificationsOpen) return null;

  const iconMap = {
    danger: AlertTriangle,
    warning: AlertCircle,
    info: Info,
    success: CheckCircle,
  };
  const colorMap = {
    danger: 'text-cyber-danger',
    warning: 'text-yellow-400',
    info: 'text-cyber-neon',
    success: 'text-cyber-neonGreen',
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
      <div className="fixed top-14 right-4 w-80 z-50 glass-strong rounded-2xl border border-cyber-border
        shadow-[0_8px_32px_rgba(0,0,0,0.6)] animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-cyber-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-cyber-neon" />
            <h3 className="text-sm font-semibold text-cyber-text">Notifications</h3>
            {notifications.length > 0 && (
              <span className="bg-cyber-neonPink text-white text-[10px] font-bold rounded-full px-1.5">
                {notifications.length}
              </span>
            )}
          </div>
          <button onClick={() => setNotificationsOpen(false)} className="text-cyber-muted hover:text-cyber-text transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-8 h-8 text-cyber-neonGreen mx-auto mb-2" />
              <p className="text-sm text-cyber-muted">All clear! No alerts.</p>
            </div>
          ) : (
            <div className="divide-y divide-cyber-border/50">
              {notifications.map((n) => {
                const Icon = iconMap[n.type] || Info;
                const color = colorMap[n.type] || 'text-cyber-neon';
                return (
                  <div key={n.id} className="p-3 flex items-start gap-3 hover:bg-white/5 transition-colors">
                    <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-cyber-text">{n.message}</p>
                      <p className="text-[10px] text-cyber-muted font-mono mt-0.5">
                        {n.time ? format(new Date(n.time), 'HH:mm:ss') : 'Just now'}
                      </p>
                    </div>
                    <button onClick={() => clearNotification(n.id)} className="text-cyber-muted hover:text-cyber-text transition-colors flex-shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationPanel;
