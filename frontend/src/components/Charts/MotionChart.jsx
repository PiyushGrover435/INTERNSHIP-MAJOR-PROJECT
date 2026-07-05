import React from 'react';
import { Bar } from 'react-chartjs-2';
import { useApp } from '../../context/AppContext';
import './ChartSetup';
import { Move } from 'lucide-react';

const MotionChart = ({ height = 200 }) => {
  const { history } = useApp();

  const data = {
    labels: history.labels,
    datasets: [{
      label: 'Motion Activity',
      data: history.motion,
      backgroundColor: history.motion.map(v =>
        v > 7 ? 'rgba(255,61,113,0.7)' : v > 4 ? 'rgba(255,170,0,0.7)' : 'rgba(0,245,255,0.5)'
      ),
      borderColor: history.motion.map(v =>
        v > 7 ? '#ff3d71' : v > 4 ? '#ffaa00' : '#00f5ff'
      ),
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(10,15,30,0.95)',
        borderColor: '#00f5ff',
        borderWidth: 1,
        titleColor: '#00f5ff',
        bodyColor: '#e2e8f0',
        padding: 10,
        cornerRadius: 8,
        callbacks: { label: ctx => ` ${ctx.raw} m/s²` },
      },
    },
    scales: {
      x: { grid: { color: 'rgba(26,39,68,0.6)' }, ticks: { maxTicksLimit: 6, color: '#64748b' } },
      y: { min: 0, max: 12, grid: { color: 'rgba(26,39,68,0.6)' }, ticks: { color: '#64748b' } },
    },
  };

  const latest = history.motion[history.motion.length - 1];

  return (
    <div className="glass rounded-2xl p-4 neon-border-cyan">
      <div className="flex items-center gap-2 mb-3">
        <Move className="w-4 h-4 text-cyber-neon" />
        <h3 className="text-sm font-semibold text-cyber-text">Motion Activity (MPU6050)</h3>
        <span className="ml-auto text-xs font-mono text-cyber-neon">
          {latest !== undefined ? `${latest} m/s²` : '-- m/s²'}
        </span>
      </div>
      <div style={{ height }}>
        {history.labels.length > 0
          ? <Bar data={data} options={options} />
          : <div className="flex items-center justify-center h-full text-cyber-muted text-xs">Collecting data...</div>
        }
      </div>
    </div>
  );
};

export default MotionChart;
