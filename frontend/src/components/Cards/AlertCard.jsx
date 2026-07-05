import React from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { format } from 'date-fns';

const AlertCard = ({ alert, onDismiss }) => {
  const configs = {
    danger: {
      border: 'border-cyber-danger/40',
      bg: 'from-red-900/20 to-transparent',
      text: 'text-cyber-danger',
      icon: AlertTriangle,
      glow: 'shadow-[0_0_15px_rgba(255,61,113,0.2)]',
      badge: 'bg-red-500/20 text-cyber-danger border-cyber-danger/30',
      label: 'CRITICAL',
    },
    warning: {
      border: 'border-yellow-500/40',
      bg: 'from-yellow-900/20 to-transparent',
      text: 'text-yellow-400',
      icon: AlertCircle,
      glow: 'shadow-[0_0_15px_rgba(255,170,0,0.2)]',
      badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      label: 'WARNING',
    },
    info: {
      border: 'border-cyber-neon/20',
      bg: 'from-cyan-900/10 to-transparent',
      text: 'text-cyber-neon',
      icon: Info,
      glow: '',
      badge: 'bg-cyan-500/20 text-cyber-neon border-cyber-neon/30',
      label: 'INFO',
    },
  };

  const cfg = configs[alert.type] || configs.info;
  const Icon = cfg.icon;

  return (
    <div className={`glass rounded-xl p-4 border ${cfg.border} ${cfg.glow}
      bg-gradient-to-br ${cfg.bg} animate-fade-in relative overflow-hidden`}>
      {alert.type === 'danger' && (
        <div className="absolute inset-0 border border-cyber-danger/20 rounded-xl animate-pulse" />
      )}

      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${cfg.bg} border ${cfg.border}`}>
          <Icon className={`w-4 h-4 ${cfg.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
              {cfg.label}
            </span>
            <span className="text-[10px] text-cyber-muted font-mono">
              {alert.time ? format(new Date(alert.time), 'HH:mm:ss') : 'Just now'}
            </span>
          </div>
          <p className={`text-sm font-medium ${cfg.text}`}>{alert.message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-cyber-muted hover:text-cyber-text transition-colors mt-0.5 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default AlertCard;
