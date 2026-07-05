import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Activity, Brain, Shield, Zap, ChevronRight, Cpu, Wifi, Cloud } from 'lucide-react';

const StatBadge = ({ value, label, color }) => (
  <div className={`glass rounded-xl p-4 border ${color} text-center card-hover`}>
    <div className="text-2xl font-bold font-mono text-cyber-text mb-1">{value}</div>
    <div className="text-xs text-cyber-muted">{label}</div>
  </div>
);

const FeatureCard = ({ icon: Icon, title, desc, color, to }) => (
  <Link to={to} className="glass rounded-2xl p-6 border border-cyber-border hover:border-cyber-neon/30 
    transition-all card-hover group block">
    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-transparent to-transparent 
      border ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
      <Icon className={`w-6 h-6 ${color.replace('border-', 'text-').replace('/30', '')}`} />
    </div>
    <h3 className="font-semibold text-cyber-text mb-2">{title}</h3>
    <p className="text-sm text-cyber-muted leading-relaxed">{desc}</p>
    <div className="flex items-center gap-1 mt-4 text-xs text-cyber-neon opacity-0 group-hover:opacity-100 transition-opacity">
      Open <ChevronRight className="w-3 h-3" />
    </div>
  </Link>
);

const Home = () => {
  const { sensorData, prediction, deviceStatus } = useApp();

  const features = [
    { icon: Activity, title: 'Live Dashboard',  desc: 'Real-time sensor data from ESP32 — heart rate, stress, motion updated every 15s.', color: 'border-cyber-neonPink/30', to: '/dashboard' },
    { icon: Brain,    title: 'AI Prediction',   desc: 'CatBoost Stacking Ensemble (LGBM + XGBoost + ExtraTrees) predicts LOW/MEDIUM/HIGH mental health risk.', color: 'border-purple-400/30', to: '/ai-prediction' },
    { icon: Zap,      title: 'EEG Simulator',   desc: 'Clinical EEG dataset streamed row-by-row to prove hospital-grade hardware integration readiness.', color: 'border-purple-500/30', to: '/eeg-simulator' },
    { icon: Shield,   title: 'Alert History',   desc: 'Log of all past emergency alerts with timestamps and sensor readings from Firebase.', color: 'border-cyber-danger/30', to: '/alert-history' },
  ];

  return (
    <div className="min-h-screen grid-bg">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 glow-bg-cyan opacity-30 pointer-events-none" />
        <div className="absolute top-20 right-10 w-64 h-64 rounded-full bg-cyber-neonPurple/5 blur-3xl" />
        
        <div className="relative px-6 py-16 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-cyber-neon/20 
            text-xs text-cyber-neon font-mono mb-6 animate-float">
            <div className="status-dot online" />
            ESP32 + MPU6050 + Potentiometer · IoT Live Monitor
          </div>

          <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
            <span className="text-cyber-text">AI-Powered</span>
            <br />
            <span className="neon-cyan">Mental Health</span>
            <br />
            <span className="text-cyber-text">IoT Dashboard</span>
          </h1>

          <p className="text-lg text-cyber-muted max-w-2xl mx-auto mb-8 leading-relaxed">
            Real-time stress and wellness monitoring using ESP32 hardware simulation, 
            ThingSpeak cloud integration, and machine learning risk prediction.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/dashboard"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyber-neon/20 to-cyber-neonPurple/20
                border border-cyber-neon/40 text-cyber-neon font-semibold hover:from-cyber-neon/30 
                hover:to-cyber-neonPurple/30 transition-all flex items-center justify-center gap-2
                shadow-[0_0_20px_rgba(0,245,255,0.15)]">
              <Activity className="w-5 h-5" />
              Open Live Dashboard
            </Link>
            <Link to="/ai-prediction"
              className="px-6 py-3 rounded-xl glass border border-cyber-border text-cyber-text 
                font-semibold hover:border-cyber-neon/30 transition-all flex items-center justify-center gap-2">
              <Brain className="w-5 h-5" />
              Try AI Prediction
            </Link>
          </div>
        </div>
      </div>

      {/* Live Stats */}
      <div className="px-6 pb-10 max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <StatBadge value={`${sensorData.heartRate} BPM`} label="Heart Rate" color="neon-border-pink" />
          <StatBadge value={`${sensorData.stress}%`} label="Stress Level" color="neon-border-purple" />
          <StatBadge value={sensorData.motion} label="Motion (m/s²)" color="neon-border-cyan" />
          <div className={`glass rounded-xl p-4 border text-center card-hover
            ${prediction.risk === 'HIGH' ? 'neon-border-pink' : prediction.risk === 'MEDIUM' ? 'border-yellow-500/30' : 'neon-border-green'}`}>
            <div className={`text-2xl font-bold font-mono mb-1
              ${prediction.risk === 'HIGH' ? 'text-cyber-danger' : prediction.risk === 'MEDIUM' ? 'text-yellow-400' : 'text-cyber-neonGreen'}`}>
              {prediction.risk}
            </div>
            <div className="text-xs text-cyber-muted">AI Risk Level</div>
          </div>
        </div>

        {/* Features */}
        <h2 className="text-xl font-bold text-cyber-text mb-6 text-center">System Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-12">
          {features.map((f, i) => <FeatureCard key={i} {...f} />)}
        </div>

        {/* Tech stack */}
        <div className="glass rounded-2xl p-6 neon-border-cyan">
          <h3 className="text-sm font-semibold text-cyber-text mb-4 text-center">Technology Stack</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
            {[
              { label: 'ESP32 / NodeMCU', sub: 'Wokwi Simulation',       icon: Cpu,   color: 'text-cyber-neon'   },
              { label: 'ThingSpeak',      sub: 'Cloud IoT API',          icon: Cloud, color: 'text-blue-400'     },
              { label: 'CatBoost Stack',  sub: 'Stacking Ensemble ML',   icon: Brain, color: 'text-purple-400'   },
              { label: 'Firebase',        sub: 'Realtime Database',       icon: Wifi,  color: 'text-orange-400'  },
            ].map(({ label, sub, icon: Icon, color }) => (
              <div key={label} className="p-3 glass rounded-xl border border-cyber-border">
                <Icon className={`w-6 h-6 ${color} mx-auto mb-1`} />
                <div className={`font-semibold ${color}`}>{label}</div>
                <div className="text-cyber-muted">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
