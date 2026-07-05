import React, { useState, useEffect, useCallback } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import '../components/Charts/ChartSetup';
import { useApp } from '../context/AppContext';
import {
  Brain, Moon, Sun, Activity, Heart, AlertTriangle,
  Music, Wind, BookOpen, Phone, RefreshCw, TrendingUp
} from 'lucide-react';

const FLASK_URL = import.meta.env.VITE_FLASK_URL || 'http://localhost:5000';

// ── Helpers ──────────────────────────────────────────────────────────────────
const riskColor = (level) => {
  if (level === 'CRITICAL') return 'text-red-400';
  if (level === 'HIGH')     return 'text-orange-400';
  if (level === 'MEDIUM')   return 'text-yellow-400';
  return 'text-cyber-neonGreen';
};

const riskBg = (level) => {
  if (level === 'CRITICAL') return 'bg-red-500/15 border-red-500/30';
  if (level === 'HIGH')     return 'bg-orange-500/15 border-orange-500/30';
  if (level === 'MEDIUM')   return 'bg-yellow-500/15 border-yellow-500/30';
  return 'bg-cyber-neonGreen/10 border-cyber-neonGreen/30';
};

const actionIcon = (type) => {
  const map = { voice: Brain, music: Music, breathe: Wind, journal: BookOpen, contact: Phone, walk: Activity };
  const Icon = map[type] || Activity;
  return <Icon className="w-4 h-4" />;
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const PatientBehaviour = () => {
  const { hallucinationData, sensorData } = useApp();
  const [history, setHistory] = useState([]);
  const [sleepSummary, setSleepSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [histRes, sleepRes] = await Promise.all([
        fetch(`${FLASK_URL}/api/routine/history?limit=100`),
        fetch(`${FLASK_URL}/api/routine/sleep-summary?hours=24`),
      ]);
      if (histRes.ok)  setHistory((await histRes.json()).data || []);
      if (sleepRes.ok) setSleepSummary(await sleepRes.json());
      setLastRefresh(new Date());
    } catch {
      // Flask not running — use mock demo data
      setHistory(generateMockHistory());
      setSleepSummary({ avg_sleep_quality: 58, sleep_deficit_flag: false, total_sleep_readings: 24, total_readings: 96, window_hours: 24 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Chart Data ──────────────────────────────────────────────────
  const timeLabels = history.slice(0, 40).reverse().map((r, i) =>
    i % 8 === 0 ? new Date(r.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : ''
  );

  const heartRateData = {
    labels: timeLabels,
    datasets: [{
      label: 'Heart Rate (BPM)',
      data: history.slice(0, 40).reverse().map(r => r.heart_rate),
      borderColor: '#ff3d71',
      backgroundColor: 'rgba(255,61,113,0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointRadius: 0,
    }],
  };

  const motionData = {
    labels: timeLabels,
    datasets: [{
      label: 'Motion Level',
      data: history.slice(0, 40).reverse().map(r => r.motion_level),
      borderColor: '#00f5ff',
      backgroundColor: 'rgba(0,245,255,0.08)',
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointRadius: 0,
    }],
  };

  const sleepQualityData = {
    labels: history.slice(0, 24).reverse().map((r, i) =>
      i % 4 === 0 ? new Date(r.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : ''
    ),
    datasets: [{
      label: 'Sleep Quality Score',
      data: history.slice(0, 24).reverse().map(r => r.sleep_quality_score),
      backgroundColor: history.slice(0, 24).reverse().map(r =>
        r.sleep_status === 'SLEEPING' ? 'rgba(138,43,226,0.6)' : 'rgba(255,165,0,0.3)'
      ),
      borderColor: history.slice(0, 24).reverse().map(r =>
        r.sleep_status === 'SLEEPING' ? '#8a2be2' : '#ffa500'
      ),
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  // Sleeping vs Awake count
  const sleepCount  = history.filter(r => r.sleep_status === 'SLEEPING').length;
  const awakeCount  = history.length - sleepCount;
  const statusDonut = {
    labels: ['Sleeping 💤', 'Awake 🌞'],
    datasets: [{
      data: [sleepCount || 1, awakeCount || 1],
      backgroundColor: ['rgba(138,43,226,0.7)', 'rgba(0,245,255,0.4)'],
      borderColor: ['#8a2be2', '#00f5ff'],
      borderWidth: 2,
    }],
  };

  const chartOpts = (yLabel = '') => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8892b0', font: { size: 10 } } },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#8892b0', font: { size: 10 } },
        title: { display: !!yLabel, text: yLabel, color: '#8892b0', font: { size: 10 } }
      },
    },
  });

  const hall = hallucinationData || {};
  const risk = hall.hallucination_level || 'LOW';
  const riskPct = hall.hallucination_risk || 0;

  if (loading && history.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-96">
        <div className="text-cyber-muted text-sm font-mono animate-pulse">Loading patient data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cyber-text flex items-center gap-3">
            <Brain className="w-7 h-7 text-cyber-neonPurple" />
            Patient Behaviour
          </h1>
          <p className="text-cyber-muted text-sm mt-1 font-mono">
            Sleep tracking · Hallucination risk · Activity timeline · Therapeutic recommendations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-cyber-muted font-mono">
            Updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <button onClick={fetchData}
            className="p-2 rounded-lg glass border border-cyber-border text-cyber-muted
              hover:text-cyber-neon hover:border-cyber-neon/30 transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Top Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        {/* Hallucination Risk */}
        <div className={`glass rounded-2xl border p-5 ${riskBg(risk)}`}>
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-cyber-neonPurple" />
            <span className="text-xs text-cyber-muted font-mono">Hallucination Risk</span>
          </div>
          <div className={`text-3xl font-bold font-mono ${riskColor(risk)}`}>{riskPct}%</div>
          <div className={`text-xs font-semibold mt-1 ${riskColor(risk)}`}>{risk}</div>
          <div className="mt-3 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${
              risk === 'CRITICAL' ? 'bg-red-500' : risk === 'HIGH' ? 'bg-orange-500' : risk === 'MEDIUM' ? 'bg-yellow-500' : 'bg-cyber-neonGreen'
            }`} style={{ width: `${riskPct}%` }} />
          </div>
        </div>

        {/* Sleep Quality */}
        <div className="glass rounded-2xl border border-cyber-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <Moon className="w-4 h-4 text-cyber-neonPurple" />
            <span className="text-xs text-cyber-muted font-mono">Sleep Quality</span>
          </div>
          <div className="text-3xl font-bold font-mono text-cyber-neonPurple">
            {sleepSummary ? Math.round(sleepSummary.avg_sleep_quality) : 0}
            <span className="text-lg">/100</span>
          </div>
          <div className={`text-xs mt-1 font-semibold ${sleepSummary?.sleep_deficit_flag ? 'text-red-400' : 'text-cyber-neonGreen'}`}>
            {sleepSummary?.sleep_deficit_flag ? '⚠ Sleep Deficit' : '✓ Adequate Sleep'}
          </div>
        </div>

        {/* Current Status */}
        <div className="glass rounded-2xl border border-cyber-border p-5">
          <div className="flex items-center gap-2 mb-3">
            {hall.sleep_status === 'SLEEPING'
              ? <Moon className="w-4 h-4 text-cyber-neonPurple" />
              : <Sun className="w-4 h-4 text-yellow-400" />}
            <span className="text-xs text-cyber-muted font-mono">Current Status</span>
          </div>
          <div className={`text-xl font-bold font-mono mt-1 ${hall.sleep_status === 'SLEEPING' ? 'text-cyber-neonPurple' : 'text-yellow-400'}`}>
            {hall.sleep_status === 'SLEEPING' ? '💤 Sleeping' : '🌞 Awake'}
          </div>
          <div className="text-xs text-cyber-muted mt-2">
            Sleep score: {Math.round(hall.sleep_quality_score || 0)}/100
          </div>
        </div>

        {/* Heart Rate */}
        <div className="glass rounded-2xl border border-cyber-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-4 h-4 text-cyber-neonPink" />
            <span className="text-xs text-cyber-muted font-mono">Heart Rate</span>
          </div>
          <div className="text-3xl font-bold font-mono text-cyber-neonPink">
            {sensorData?.heartRate || '--'}
            <span className="text-base font-normal ml-1">BPM</span>
          </div>
          <div className="text-xs text-cyber-muted mt-1">
            Stress: {sensorData?.stress || '--'}%
          </div>
        </div>
      </div>

      {/* ── Charts Row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Heart Rate Timeline */}
        <div className="glass rounded-2xl border border-cyber-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-4 h-4 text-cyber-neonPink" />
            <h3 className="text-sm font-semibold text-cyber-text">Heart Rate Timeline</h3>
            <span className="ml-auto text-[10px] text-cyber-muted font-mono">Last {history.length} readings</span>
          </div>
          <div className="h-44">
            {history.length > 0
              ? <Line data={heartRateData} options={chartOpts('BPM')} />
              : <div className="flex items-center justify-center h-full text-cyber-muted text-sm">Waiting for data...</div>}
          </div>
        </div>

        {/* Motion & Activity Timeline */}
        <div className="glass rounded-2xl border border-cyber-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-cyber-neon" />
            <h3 className="text-sm font-semibold text-cyber-text">🏃 Motion & Activity Timeline</h3>
          </div>
          <div className="h-44">
            {history.length > 0
              ? <Line data={motionData} options={chartOpts('Motion')} />
              : <div className="flex items-center justify-center h-full text-cyber-muted text-sm">Waiting for data...</div>}
          </div>
        </div>
      </div>

      {/* ── Charts Row 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Sleep Quality Chart */}
        <div className="lg:col-span-2 glass rounded-2xl border border-cyber-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Moon className="w-4 h-4 text-cyber-neonPurple" />
            <h3 className="text-sm font-semibold text-cyber-text">📊 Sleep Quality (Last 24 Hours)</h3>
            <div className="ml-auto flex items-center gap-3 text-[10px] font-mono text-cyber-muted">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-purple-500 inline-block" /> Sleeping</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-orange-400 inline-block" /> Awake</span>
            </div>
          </div>
          <div className="h-48">
            {history.length > 0
              ? <Bar data={sleepQualityData} options={chartOpts('Quality')} />
              : <div className="flex items-center justify-center h-full text-cyber-muted text-sm">Waiting for data...</div>}
          </div>
        </div>

        {/* Sleeping vs Awake Donut */}
        <div className="glass rounded-2xl border border-cyber-border p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-cyber-neonGreen" />
            <h3 className="text-sm font-semibold text-cyber-text">💤 Sleep vs Awake</h3>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="h-40 w-40">
              <Doughnut data={statusDonut} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { color: '#8892b0', font: { size: 10 }, padding: 8, boxWidth: 12 } }
                },
                cutout: '65%',
              }} />
            </div>
          </div>
          <div className="mt-3 text-center">
            {sleepSummary && (
              <p className="text-[11px] text-cyber-muted font-mono">
                {sleepSummary.total_sleep_readings} sleep / {sleepSummary.total_readings} total readings
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Therapeutic Recommendations ── */}
      {hall.recommendations && hall.recommendations.length > 0 && (
        <div className="glass rounded-2xl border border-cyber-neonPurple/30 p-6">
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle className="w-5 h-5 text-cyber-neonPurple" />
            <h3 className="text-base font-semibold text-cyber-text">🎯 Therapeutic Recommendations</h3>
            <span className={`ml-auto text-xs font-mono px-3 py-1 rounded-full border ${riskBg(risk)} ${riskColor(risk)}`}>
              {risk} Risk
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {hall.recommendations.map((rec, i) => (
              <div key={i}
                className="glass rounded-xl border border-cyber-border p-4 hover:border-cyber-neonPurple/40
                  transition-all duration-200 cursor-pointer group">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-cyber-neonPurple group-hover:scale-110 transition-transform">
                    {actionIcon(rec.type)}
                  </div>
                  <span className="text-xs font-semibold text-cyber-text">{rec.label}</span>
                </div>
                {rec.message && (
                  <p className="text-[11px] text-cyber-muted leading-relaxed line-clamp-3">{rec.message}</p>
                )}
                {rec.url && (
                  <a href={rec.url} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] text-cyber-neon hover:text-cyber-neonPurple underline mt-1 block">
                    Open →
                  </a>
                )}
                {rec.duration && (
                  <span className="text-[10px] text-cyber-muted mt-1 block font-mono">{rec.duration}s exercise</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Activity Log ── */}
      <div className="glass rounded-2xl border border-cyber-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-cyber-neon" />
          <h3 className="text-sm font-semibold text-cyber-text">Recent Activity Log</h3>
          <span className="ml-auto text-[10px] text-cyber-muted font-mono">Last 10 entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-cyber-muted border-b border-cyber-border">
                <th className="text-left py-2 pr-4">Time</th>
                <th className="text-right pr-4">HR</th>
                <th className="text-right pr-4">Stress</th>
                <th className="text-right pr-4">Motion</th>
                <th className="text-center pr-4">Status</th>
                <th className="text-right">Quality</th>
              </tr>
            </thead>
            <tbody>
              {history.slice(0, 10).map((row, i) => (
                <tr key={i} className="border-b border-cyber-border/30 hover:bg-white/3 transition-colors">
                  <td className="py-2 pr-4 text-cyber-muted">
                    {new Date(row.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="text-right pr-4 text-cyber-neonPink">{Math.round(row.heart_rate)}</td>
                  <td className="text-right pr-4 text-yellow-400">{Math.round(row.stress)}%</td>
                  <td className="text-right pr-4 text-cyber-neon">{row.motion_level?.toFixed(1)}</td>
                  <td className="text-center pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold
                      ${row.sleep_status === 'SLEEPING'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-yellow-500/15 text-yellow-400'}`}>
                      {row.sleep_status === 'SLEEPING' ? '💤' : '🌞'} {row.sleep_status}
                    </span>
                  </td>
                  <td className="text-right text-cyber-neonGreen">{Math.round(row.sleep_quality_score)}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-cyber-muted">No data yet. Waiting for sensor readings...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

// Mock data for when Flask is offline
function generateMockHistory() {
  const now = Date.now();
  return Array.from({ length: 40 }, (_, i) => {
    const sleeping = i > 15 && i < 28;
    return {
      timestamp: new Date(now - (39 - i) * 60000).toISOString(),
      heart_rate: sleeping ? 58 + Math.random() * 8 : 72 + Math.random() * 30,
      stress: sleeping ? 10 + Math.random() * 20 : 30 + Math.random() * 50,
      motion_level: sleeping ? Math.random() * 0.5 : Math.random() * 5 + 0.5,
      sleep_status: sleeping ? 'SLEEPING' : 'AWAKE',
      sleep_quality_score: sleeping ? 60 + Math.random() * 35 : 0,
    };
  });
}

export default PatientBehaviour;
