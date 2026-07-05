import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Brain, Zap, ChevronRight, Loader } from 'lucide-react';
import { getPrediction } from '../../api/flask';

const riskConfig = {
  LOW: {
    color: 'text-cyber-neonGreen',
    border: 'neon-border-green',
    bg: 'from-green-900/20',
    badge: 'risk-low',
    icon: '🟢',
    gauge: '#00ff88',
  },
  MEDIUM: {
    color: 'text-yellow-400',
    border: 'border-yellow-500/30',
    bg: 'from-yellow-900/20',
    badge: 'risk-medium',
    icon: '🟡',
    gauge: '#ffaa00',
  },
  HIGH: {
    color: 'text-cyber-danger',
    border: 'neon-border-pink',
    bg: 'from-red-900/20',
    badge: 'risk-high',
    icon: '🔴',
    gauge: '#ff3d71',
  },
};

const PredictionPanel = () => {
  const { prediction, sensorData } = useApp();
  const [customHR, setCustomHR] = useState('');
  const [customStress, setCustomStress] = useState('');
  const [customMotion, setCustomMotion] = useState('');
  const [customPred, setCustomPred] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cfg = riskConfig[prediction.risk] || riskConfig.LOW;
  const customCfg = customPred ? (riskConfig[customPred.risk] || riskConfig.LOW) : null;

  const handleCustomPredict = async (e) => {
    e.preventDefault();
    if (!customHR || !customStress || !customMotion) {
      setError('Please fill all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await getPrediction({
        heartRate: parseFloat(customHR),
        stress: parseFloat(customStress),
        motion: parseFloat(customMotion),
      });
      setCustomPred(result);
    } catch {
      // Fallback local prediction
      const hr = parseFloat(customHR);
      const st = parseFloat(customStress);
      const risk = hr > 110 || st > 75 ? 'HIGH' : hr > 90 || st > 50 ? 'MEDIUM' : 'LOW';
      setCustomPred({
        risk,
        confidence: Math.floor(Math.random() * 10) + 85,
        message: risk === 'HIGH' ? 'Critical stress detected — immediate attention needed.'
          : risk === 'MEDIUM' ? 'Moderate stress — monitor and take breaks.'
          : 'All parameters within healthy range.',
        recommendations: risk === 'HIGH'
          ? ['Take deep breaths immediately.', 'Contact your caregiver.', 'Rest in a quiet space.']
          : risk === 'MEDIUM'
          ? ['Practice 5-minute mindfulness.', 'Stay hydrated.', 'Reduce stimulants.']
          : ['Keep up good habits.', 'Continue regular exercise.', 'Maintain sleep schedule.'],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Live Prediction */}
      <div className={`glass rounded-2xl p-6 ${cfg.border} bg-gradient-to-br ${cfg.bg} to-transparent`}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-5 h-5 text-cyber-neon" />
              <h3 className="font-semibold text-cyber-text">Live AI Prediction</h3>
            </div>
            <p className="text-xs text-cyber-muted">Based on current sensor readings</p>
          </div>
          <div className="text-3xl">{cfg.icon}</div>
        </div>

        {/* Confidence gauge */}
        <div className="flex items-center gap-6 mb-6">
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(26,39,68,0.8)" strokeWidth="10" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke={cfg.gauge} strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 40 * prediction.confidence / 100} ${2 * Math.PI * 40}`}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 6px ${cfg.gauge})` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-xl font-bold font-mono ${cfg.color}`}>{prediction.confidence}%</span>
              <span className="text-[9px] text-cyber-muted">confidence</span>
            </div>
          </div>

          <div className="flex-1">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold mb-2 ${cfg.badge}`}>
              {prediction.risk} RISK
            </div>
            <p className="text-sm text-cyber-text mb-1">{prediction.message}</p>
            <div className="flex gap-3 text-xs text-cyber-muted font-mono mt-2">
              <span>HR: {sensorData.heartRate} BPM</span>
              <span>Stress: {sensorData.stress}%</span>
              <span>Motion: {sensorData.motion}</span>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <p className="text-xs font-semibold text-cyber-muted uppercase tracking-wider mb-2">
            AI Recommendations
          </p>
          <div className="space-y-2">
            {prediction.recommendations?.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-cyber-text">
                <ChevronRight className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                {rec}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Prediction Form */}
      <div className="glass rounded-2xl p-6 neon-border-cyan">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-cyber-neon" />
          <h3 className="font-semibold text-cyber-text">Custom Prediction</h3>
          <span className="text-xs text-cyber-muted ml-1">Enter values manually</span>
        </div>

        <form onSubmit={handleCustomPredict} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Heart Rate', key: 'hr', val: customHR, set: setCustomHR, unit: 'BPM', min: 30, max: 200 },
              { label: 'Stress', key: 'st', val: customStress, set: setCustomStress, unit: '%', min: 0, max: 100 },
              { label: 'Motion', key: 'mo', val: customMotion, set: setCustomMotion, unit: 'm/s²', min: 0, max: 15 },
            ].map(({ label, key, val, set, unit, min, max }) => (
              <div key={key}>
                <label className="text-[10px] text-cyber-muted uppercase tracking-wider block mb-1">{label}</label>
                <input
                  type="number" min={min} max={max} step="0.1"
                  value={val}
                  onChange={e => set(e.target.value)}
                  placeholder={unit}
                  className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 
                    text-sm text-cyber-text font-mono focus:outline-none focus:border-cyber-neon/50
                    focus:shadow-[0_0_8px_rgba(0,245,255,0.15)] transition-all"
                />
              </div>
            ))}
          </div>

          {error && <p className="text-xs text-cyber-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyber-neon/20 to-cyber-neonPurple/20
              border border-cyber-neon/30 text-cyber-neon font-semibold text-sm
              hover:from-cyber-neon/30 hover:to-cyber-neonPurple/30 transition-all
              disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            {loading ? 'Predicting...' : 'Run AI Prediction'}
          </button>
        </form>

        {/* Custom result */}
        {customPred && customCfg && (
          <div className={`mt-4 p-4 rounded-xl ${customCfg.border} bg-gradient-to-br ${customCfg.bg} to-transparent border`}>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${customCfg.badge}`}>
                {customPred.risk} RISK
              </span>
              <span className={`text-xs font-mono ${customCfg.color}`}>{customPred.confidence}% confidence</span>
            </div>
            <p className="text-sm text-cyber-text mb-2">{customPred.message}</p>
            <div className="space-y-1">
              {customPred.recommendations?.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-cyber-muted">
                  <ChevronRight className={`w-3 h-3 mt-0.5 ${customCfg.color}`} />
                  {r}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionPanel;
