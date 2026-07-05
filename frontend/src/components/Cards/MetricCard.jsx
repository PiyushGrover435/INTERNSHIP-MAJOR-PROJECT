import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const MetricCard = ({
  title,
  value,
  unit,
  icon: Icon,
  color = 'cyan',
  trend = 0,
  min,
  max,
  description,
  className = '',
}) => {
  const colorMap = {
    cyan: { border: 'neon-border-cyan', text: 'text-cyber-neon', bg: 'from-cyber-neon/10 to-transparent', glow: 'rgba(0,245,255,0.15)' },
    purple: { border: 'neon-border-purple', text: 'text-purple-400', bg: 'from-purple-500/10 to-transparent', glow: 'rgba(191,0,255,0.15)' },
    green: { border: 'neon-border-green', text: 'text-cyber-neonGreen', bg: 'from-green-400/10 to-transparent', glow: 'rgba(0,255,136,0.15)' },
    pink: { border: 'neon-border-pink', text: 'text-cyber-neonPink', bg: 'from-pink-500/10 to-transparent', glow: 'rgba(255,0,128,0.15)' },
    orange: { border: 'neon-border-orange', text: 'text-orange-400', bg: 'from-orange-500/10 to-transparent', glow: 'rgba(255,107,53,0.15)' },
    yellow: { border: 'border-yellow-500/30', text: 'text-yellow-400', bg: 'from-yellow-400/10 to-transparent', glow: 'rgba(255,215,0,0.15)' },
  };

  const c = colorMap[color] || colorMap.cyan;

  const progressPercent = min !== undefined && max !== undefined
    ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
    : null;

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-cyber-danger' : trend < 0 ? 'text-cyber-neonGreen' : 'text-cyber-muted';

  return (
    <div className={`glass rounded-2xl p-5 card-hover relative overflow-hidden scan-overlay ${c.border} ${className}`}>
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${c.bg} pointer-events-none`} />

      {/* Header */}
      <div className="relative flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-cyber-muted font-medium uppercase tracking-widest">{title}</p>
          {description && <p className="text-[10px] text-cyber-muted/60 mt-0.5">{description}</p>}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.bg} border ${c.border} 
            flex items-center justify-center ${c.text}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Value */}
      <div className="relative flex items-end gap-2 mb-3">
        <span className={`metric-value text-3xl font-bold ${c.text}`}>
          {typeof value === 'number' ? value.toFixed(value > 10 ? 0 : 1) : value}
        </span>
        {unit && <span className="text-sm text-cyber-muted mb-1">{unit}</span>}
        <div className={`ml-auto flex items-center gap-1 text-xs ${trendColor}`}>
          <TrendIcon className="w-3 h-3" />
          <span>{Math.abs(trend)}%</span>
        </div>
      </div>

      {/* Progress bar */}
      {progressPercent !== null && (
        <div className="progress-bar">
          <div
            className={`progress-fill bg-gradient-to-r ${c.bg.replace('to-transparent', 'to-current')}`}
            style={{
              width: `${progressPercent}%`,
              background: `linear-gradient(90deg, ${c.glow.replace('0.15', '0.6')}, ${c.glow.replace('0.15', '1')})`,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default MetricCard;
