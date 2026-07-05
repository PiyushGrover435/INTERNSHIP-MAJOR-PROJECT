import React from 'react';
import { useApp } from '../context/AppContext';
import MetricCard from '../components/Cards/MetricCard';
import AlertCard from '../components/Cards/AlertCard';
import DeviceStatusCard from '../components/Cards/DeviceStatusCard';
import HeartRateChart from '../components/Charts/HeartRateChart';
import StressChart from '../components/Charts/StressChart';
import MotionChart from '../components/Charts/MotionChart';
import RiskHistoryChart from '../components/Charts/RiskHistoryChart';
import { Heart, Brain, Move, Activity, RefreshCw, Clock } from 'lucide-react';
import { format } from 'date-fns';

const Dashboard = () => {
  const { sensorData, prediction, alerts, deviceStatus, refreshData } = useApp();

  const riskColorMap = {
    LOW: { text: 'text-cyber-neonGreen', badge: 'risk-low' },
    MEDIUM: { text: 'text-yellow-400', badge: 'risk-medium' },
    HIGH: { text: 'text-cyber-danger', badge: 'risk-high' },
  };
  const rc = riskColorMap[prediction.risk] || riskColorMap.LOW;

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-cyber-text">Live Monitoring Dashboard</h1>
          <div className="flex items-center gap-2 text-xs text-cyber-muted font-mono mt-1">
            <Clock className="w-3 h-3" />
            Last update: {deviceStatus.lastUpdate ? format(new Date(deviceStatus.lastUpdate), 'HH:mm:ss') : '--'}
            <span className="text-cyber-muted">· Auto-refresh every 15s</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${rc.badge}`}>
            AI: {prediction.risk} RISK
          </div>
          <button
            onClick={refreshData}
            className="p-2 rounded-lg glass border border-cyber-border hover:border-cyber-neon/30 
              text-cyber-muted hover:text-cyber-neon transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => <AlertCard key={i} alert={a} />)}
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Heart Rate"
          description="Potentiometer simulation"
          value={sensorData.heartRate}
          unit="BPM"
          icon={Heart}
          color="pink"
          trend={sensorData.heartRate > 90 ? 5 : -2}
          min={40}
          max={180}
        />
        <MetricCard
          title="Stress Level"
          description="Derived stress score"
          value={sensorData.stress}
          unit="%"
          icon={Brain}
          color="purple"
          trend={sensorData.stress > 60 ? 8 : -3}
          min={0}
          max={100}
        />
        <MetricCard
          title="Motion Activity"
          description="MPU6050 accelerometer"
          value={sensorData.motion}
          unit="m/s²"
          icon={Move}
          color="cyan"
          trend={0}
          min={0}
          max={12}
        />
        <MetricCard
          title="AI Confidence"
          description={`${prediction.risk} risk prediction`}
          value={prediction.confidence}
          unit="%"
          icon={Activity}
          color={prediction.risk === 'HIGH' ? 'pink' : prediction.risk === 'MEDIUM' ? 'yellow' : 'green'}
          trend={2}
          min={0}
          max={100}
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HeartRateChart height={200} />
        <StressChart height={200} />
        <MotionChart height={200} />
        <RiskHistoryChart height={200} />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Device status */}
        <DeviceStatusCard />

        {/* AI summary */}
        <div className="lg:col-span-2 glass rounded-2xl p-5 neon-border-cyan">
          <h3 className="text-sm font-semibold text-cyber-text mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4 text-cyber-neon" />
            AI Analysis Summary
          </h3>
          <div className={`p-4 rounded-xl border mb-4 ${rc.badge} bg-gradient-to-br from-current/5 to-transparent`}>
            <p className="text-sm text-cyber-text">{prediction.message}</p>
          </div>
          <div className="space-y-2">
            {prediction.recommendations?.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-cyber-muted">
                <div className={`w-1.5 h-1.5 rounded-full ${rc.text} bg-current`} />
                {r}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
