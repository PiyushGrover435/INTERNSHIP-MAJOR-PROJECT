import React from 'react';
import { Cpu, Wifi, Brain, Database, Activity, Shield, Zap, Github } from 'lucide-react';

const Section = ({ title, children }) => (
  <div className="glass rounded-2xl p-6 neon-border-cyan">
    <h2 className="text-base font-bold text-cyber-text mb-4 flex items-center gap-2">
      <div className="w-1 h-5 bg-cyber-neon rounded-full" />
      {title}
    </h2>
    {children}
  </div>
);

const TechBadge = ({ icon: Icon, name, detail, color }) => (
  <div className="glass rounded-xl p-4 border border-cyber-border hover:border-cyber-neon/20 transition-all card-hover">
    <Icon className={`w-6 h-6 ${color} mb-2`} />
    <div className="font-semibold text-cyber-text text-sm">{name}</div>
    <div className="text-[11px] text-cyber-muted mt-0.5">{detail}</div>
  </div>
);

const About = () => (
  <div className="p-4 md:p-6 space-y-6 animate-fade-in max-w-4xl mx-auto">
    {/* Hero */}
    <div className="text-center py-8">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-cyber-neon/20 
        text-xs text-cyber-neon font-mono mb-4">
        <Activity className="w-3 h-3" />
        AI + IoT Mental Health Monitor
      </div>
      <h1 className="text-3xl font-black text-cyber-text mb-3">About This Project</h1>
      <p className="text-cyber-muted text-sm max-w-xl mx-auto leading-relaxed">
        An end-to-end IoT + AI system for real-time mental health and stress monitoring
        using ESP32 hardware simulation, cloud connectivity, and machine learning.
      </p>
    </div>

    {/* Project overview */}
    <Section title="Project Overview">
      <div className="text-sm text-cyber-muted space-y-3 leading-relaxed">
        <p>
          This system uses an <strong className="text-cyber-text">ESP32 microcontroller</strong> (simulated in Wokwi)
          connected to an <strong className="text-cyber-text">MPU6050</strong> motion sensor and a
          <strong className="text-cyber-text"> potentiometer</strong> (simulating heart rate / stress input)
          to collect real-time physiological indicators.
        </p>
        <p>
          Data is uploaded to <strong className="text-cyber-text">ThingSpeak Cloud</strong> every 15 seconds
          via WiFi. A <strong className="text-cyber-text">Flask backend</strong> hosts our trained
          <strong className="text-cyber-text"> CatBoost Stacking Ensemble</strong> (LightGBM + XGBoost + ExtraTrees
          → CatBoost meta-learner) which predicts mental health risk levels (LOW / MEDIUM / HIGH).
          Results and alerts are stored in <strong className="text-cyber-text">Firebase Realtime Database</strong>.
        </p>
        <p>
          An <strong className="text-cyber-text">EEG Simulator</strong> streams real clinical brainwave data
          (Mendeley dataset) row-by-row to the backend, proving the architecture is ready for
          hospital-grade EEG hardware integration with zero code changes.
        </p>
      </div>
    </Section>

    {/* Hardware */}
    <Section title="Hardware Components (Wokwi Simulation)">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-cyber-muted">
        {[
          { label: 'ESP32', detail: 'Main microcontroller with WiFi capability for cloud upload' },
          { label: 'MPU6050', detail: 'IMU sensor for motion/activity detection via I2C bus' },
          { label: 'Potentiometer', detail: 'Simulates heart rate & stress level inputs (replaces MAX30102)' },
        ].map(({ label, detail }) => (
          <div key={label} className="flex gap-3 p-3 glass rounded-xl border border-cyber-border">
            <div className="w-1.5 h-1.5 rounded-full bg-cyber-neon mt-2 flex-shrink-0" />
            <div>
              <span className="text-cyber-text font-semibold">{label}</span>
              <span className="text-cyber-muted"> — {detail}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 p-3 rounded-xl bg-yellow-400/5 border border-yellow-400/20">
        <p className="text-[11px] text-yellow-400">
          ⚠️ <strong>Note:</strong> MAX30102 is NOT used. The potentiometer serves as the analog
          input for simulating heart rate and stress data throughout this project.
          This is a fully software-based simulation — no physical hardware is deployed.
        </p>
      </div>
    </Section>

    {/* Tech stack */}
    <Section title="Technology Stack">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <TechBadge icon={Activity} name="React.js + Vite"    detail="Frontend SPA with Tailwind CSS"          color="text-cyber-neon"      />
        <TechBadge icon={Brain}    name="CatBoost Stacking"  detail="LGBM + XGBoost + ExtraTrees → CatBoost" color="text-purple-400"    />
        <TechBadge icon={Database} name="Firebase"           detail="Realtime Database · Alert logs"          color="text-orange-400"   />
        <TechBadge icon={Wifi}     name="ThingSpeak"         detail="IoT Cloud · Field1/2/3 API"             color="text-blue-400"     />
        <TechBadge icon={Cpu}      name="ESP32"              detail="Wokwi simulator · WiFi MCU"             color="text-cyber-neonGreen" />
        <TechBadge icon={Zap}      name="Chart.js"           detail="Real-time animated charts"              color="text-yellow-400"   />
        <TechBadge icon={Shield}   name="scikit-learn"       detail="SelectKBest · Feature pipeline"         color="text-cyber-neonPink" />
        <TechBadge icon={Github}   name="Optuna"             detail="Hyperparameter tuning · 50 trials"      color="text-cyber-muted"  />
      </div>
    </Section>

    {/* ThingSpeak fields */}
    <Section title="ThingSpeak Data Mapping">
      <div className="grid grid-cols-3 gap-4 text-center">
        {[
          { field: 'Field 1', sensor: 'Heart Rate', source: 'Potentiometer (0-1023 → 40-200 BPM)', color: 'text-cyber-neonPink', border: 'neon-border-pink' },
          { field: 'Field 2', sensor: 'Stress Level', source: 'Derived from HR + motion (0-100%)', color: 'text-purple-400', border: 'neon-border-purple' },
          { field: 'Field 3', sensor: 'Motion (m/s²)', source: 'MPU6050 accelerometer magnitude', color: 'text-cyber-neon', border: 'neon-border-cyan' },
        ].map(({ field, sensor, source, color, border }) => (
          <div key={field} className={`glass rounded-xl p-4 border ${border}`}>
            <div className="text-[10px] text-cyber-muted font-mono mb-1">{field}</div>
            <div className={`font-bold text-sm ${color} mb-1`}>{sensor}</div>
            <div className="text-[10px] text-cyber-muted">{source}</div>
          </div>
        ))}
      </div>
    </Section>

    {/* Credits */}
    <div className="text-center text-xs text-cyber-muted py-4">
      <p className="font-mono">NeuroWatch AI · IoT Mental Health Monitor · v1.0</p>
      <p className="mt-1">Built with React · Flask · Firebase · ThingSpeak · ESP32 (Wokwi)</p>
    </div>
  </div>
);

export default About;
