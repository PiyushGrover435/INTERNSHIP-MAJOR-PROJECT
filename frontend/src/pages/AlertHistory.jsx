import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { History, AlertTriangle, AlertCircle, Info, CheckCircle, Filter, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { getAlertHistory } from '../api/firebase';

const typeConfig = {
  danger: { icon: AlertTriangle, color: 'text-cyber-danger', bg: 'bg-red-900/20', border: 'border-cyber-danger/30', label: 'CRITICAL' },
  warning: { icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-500/30', label: 'WARNING' },
  info: { icon: Info, color: 'text-cyber-neon', bg: 'bg-cyan-900/10', border: 'border-cyber-neon/20', label: 'INFO' },
};

const AlertHistory = () => {
  const { alertHistory: initialHistory } = useApp();
  const [history, setHistory] = useState(initialHistory);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getAlertHistory(100);
      setHistory(data);
    } catch { /* use existing */ }
    finally { setLoading(false); }
  };

  const filtered = filter === 'all' ? history : history.filter(a => a.type === filter);

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-cyber-text flex items-center gap-2">
            <History className="w-5 h-5 text-cyber-neon" />
            Alert History
          </h1>
          <p className="text-xs text-cyber-muted mt-1">
            {history.length} records · Stored in Firebase Realtime Database
          </p>
        </div>
        <button onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass border border-cyber-border 
            text-xs text-cyber-muted hover:text-cyber-neon hover:border-cyber-neon/30 transition-all">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyber-neon' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Critical', count: history.filter(a => a.type === 'danger').length, color: 'text-cyber-danger', border: 'border-cyber-danger/30', icon: AlertTriangle },
          { label: 'Warnings', count: history.filter(a => a.type === 'warning').length, color: 'text-yellow-400', border: 'border-yellow-500/30', icon: AlertCircle },
          { label: 'Total', count: history.length, color: 'text-cyber-neon', border: 'neon-border-cyan', icon: History },
        ].map(({ label, count, color, border, icon: Icon }) => (
          <div key={label} className={`glass rounded-xl p-4 border ${border} text-center`}>
            <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
            <div className={`text-2xl font-bold font-mono ${color}`}>{count}</div>
            <div className="text-xs text-cyber-muted">{label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-cyber-muted" />
        {['all', 'danger', 'warning', 'info'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
              ${filter === f
                ? 'bg-cyber-neon/10 border border-cyber-neon/30 text-cyber-neon'
                : 'glass border border-cyber-border text-cyber-muted hover:text-cyber-text'}`}>
            {f === 'danger' ? '🔴 Critical' : f === 'warning' ? '🟡 Warning' : f === 'info' ? '🔵 Info' : '📋 All'}
          </button>
        ))}
      </div>

      {/* Alert table */}
      <div className="glass rounded-2xl overflow-hidden neon-border-cyan">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cyber-border">
                {['Type', 'Message', 'HR (BPM)', 'Stress (%)', 'Motion', 'Risk', 'Time'].map(col => (
                  <th key={col} className="px-4 py-3 text-left text-[10px] font-semibold text-cyber-muted uppercase tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <CheckCircle className="w-8 h-8 text-cyber-neonGreen mx-auto mb-2" />
                    <p className="text-cyber-muted text-sm">No alerts found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((alert) => {
                  const cfg = typeConfig[alert.type] || typeConfig.info;
                  const Icon = cfg.icon;
                  return (
                    <tr key={alert.id} className={`border-b border-cyber-border/50 ${cfg.bg} hover:bg-white/5 transition-colors`}>
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-1.5 ${cfg.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.border} ${cfg.color} bg-transparent`}>
                            {cfg.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-cyber-text max-w-xs">
                        <p className="text-xs truncate">{alert.message}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-cyber-neonPink">{alert.heartRate ?? '--'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-purple-400">{alert.stress ?? '--'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-cyber-neon">{alert.motion ?? '--'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                          ${alert.risk === 'HIGH' ? 'risk-high' : alert.risk === 'MEDIUM' ? 'risk-medium' : 'risk-low'}`}>
                          {alert.risk || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-cyber-muted font-mono text-[10px] whitespace-nowrap">
                        {alert.timestamp ? format(new Date(alert.timestamp), 'MMM dd · HH:mm:ss') : '--'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AlertHistory;
